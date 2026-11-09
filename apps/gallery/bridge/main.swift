// Ondai Mac bridge: serves Apple's on-device Foundation Model to the iOS simulator over localhost.
//
// Why: the iOS 26.2 simulator reports Apple Intelligence as available but every generation fails with
// GenerationError -1 (it cannot resolve the host's model assets). The same model runs fine in a native
// macOS process, so the gallery talks to this process when it runs in a simulator. Phones never use it.
//
// Dev only. Binds to 127.0.0.1, nothing leaves the Mac. Run with `pnpm bridge`.
//
//   GET  /health    {"available":true}
//   POST /generate  {system?, messages:[{role,text}], schema?, tools?:[{name,description,parameters}], temperature?, maxTokens?}
//                   -> {"text":...} | {"json":...} | {"toolCall":{"name","input"}} | {"error":{"kind","message"}}
//   POST /stream    same body, no schema/tools -> NDJSON lines {"delta":"..."} then {"done":true} or {"error":{...}}
//   POST /embed     {"values":["..."]} -> {"embeddings":[[...]]}

import Foundation
import FoundationModels
import NaturalLanguage
import Network

let port: UInt16 = UInt16(ProcessInfo.processInfo.environment["ONDAI_BRIDGE_PORT"] ?? "") ?? 8484

// MARK: - JSON helpers

func jsonData(_ value: Any) -> Data {
  (try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed])) ?? Data("{}".utf8)
}

func errorBody(_ error: Error) -> [String: Any] {
  ["error": ["kind": kind(of: error), "message": String(describing: error)]]
}

/// Maps Apple's errors to Ondai's error kinds (see OndaiErrorKind in @ondai/core).
func kind(of error: Error) -> String {
  if let e = error as? LanguageModelSession.GenerationError {
    switch e {
    case .exceededContextWindowSize: return "context-overflow"
    case .guardrailViolation, .refusal: return "refusal"
    case .unsupportedLanguageOrLocale: return "unsupported-language"
    case .rateLimited, .concurrentRequests: return "quota"
    case .assetsUnavailable: return "unavailable"
    case .decodingFailure, .unsupportedGuide: return "invalid-output"
    @unknown default: return "unknown"
    }
  }
  if error is CancellationError { return "cancelled" }
  return "unknown"
}

// MARK: - Prompt

struct Call {
  let instructions: String
  let prompt: String
  let schema: [String: Any]?
  let tools: [[String: Any]]
  let options: GenerationOptions

  init(_ body: [String: Any]) {
    instructions = (body["system"] as? String) ?? "You are a helpful assistant inside an app. Be brief."
    let messages = (body["messages"] as? [[String: Any]]) ?? []
    let turns = messages.compactMap { m -> (String, String)? in
      guard let role = m["role"] as? String, let text = m["text"] as? String else { return nil }
      return (role, text)
    }
    if turns.count == 1, let only = turns.first {
      prompt = only.1
    } else {
      // The bridge is stateless: earlier turns, tool calls and tool results are replayed as a transcript.
      var lines = turns.dropLast().map { role, text -> String in
        switch role {
        case "assistant": return "Assistant: \(text)"
        case "tool": return "Tool result: \(text)"
        default: return "User: \(text)"
        }
      }
      if let last = turns.last {
        lines.append(last.0 == "tool" ? "Tool result: \(last.1)\n\nUse the tool result to answer the user." : "User: \(last.1)")
      }
      prompt = lines.joined(separator: "\n")
    }
    schema = body["schema"] as? [String: Any]
    tools = (body["tools"] as? [[String: Any]]) ?? []
    let temperature = body["temperature"] as? Double
    let maxTokens = body["maxTokens"] as? Int
    options = GenerationOptions(temperature: temperature, maximumResponseTokens: maxTokens)
  }
}

// MARK: - JSON Schema -> guided generation

/// Converts the JSON Schema the AI SDK sends (from zod) into Apple's dynamic generation schema,
/// so structured output is constrained by the model's decoder instead of hoped for in the prompt.
func dynamicSchema(_ s: [String: Any], name: String) -> DynamicGenerationSchema {
  let description = s["description"] as? String
  if let options = s["enum"] as? [Any] {
    return DynamicGenerationSchema(name: name, description: description, anyOf: options.map { "\($0)" })
  }
  if let anyOf = (s["anyOf"] ?? s["oneOf"]) as? [[String: Any]], let first = anyOf.first(where: { ($0["type"] as? String) != "null" }) {
    return dynamicSchema(first, name: name)
  }
  var type = s["type"] as? String
  if let types = s["type"] as? [String] { type = types.first { $0 != "null" } }
  switch type {
  case "object":
    let props = (s["properties"] as? [String: Any]) ?? [:]
    let required = Set((s["required"] as? [String]) ?? [])
    // Keep the schema's own property order when it is available (JSONSerialization loses it), else sort.
    let ordered = props.keys.sorted()
    let properties = ordered.map { key -> DynamicGenerationSchema.Property in
      let child = (props[key] as? [String: Any]) ?? [:]
      return DynamicGenerationSchema.Property(name: key, description: child["description"] as? String, schema: dynamicSchema(child, name: "\(name)_\(key)"), isOptional: !required.contains(key))
    }
    return DynamicGenerationSchema(name: name, description: description, properties: properties)
  case "array":
    let items = (s["items"] as? [String: Any]) ?? ["type": "string"]
    return DynamicGenerationSchema(arrayOf: dynamicSchema(items, name: "\(name)_item"), minimumElements: s["minItems"] as? Int, maximumElements: s["maxItems"] as? Int)
  case "integer":
    return DynamicGenerationSchema(type: Int.self)
  case "number":
    return DynamicGenerationSchema(type: Double.self)
  case "boolean":
    return DynamicGenerationSchema(type: Bool.self)
  default:
    return DynamicGenerationSchema(type: String.self)
  }
}

func generationSchema(_ s: [String: Any], name: String) throws -> GenerationSchema {
  try GenerationSchema(root: dynamicSchema(s, name: name), dependencies: [])
}

// MARK: - Tools

/// The AI SDK runs tools in JavaScript, so the bridge only needs the model's choice: the first tool call is
/// captured and the session is stopped. The next request carries the tool result in the transcript.
actor ToolCapture {
  var call: (name: String, input: String)?
  func set(_ name: String, _ input: String) { if call == nil { call = (name, input) } }
}

struct Captured: Error {}

struct BridgeTool: Tool {
  typealias Arguments = GeneratedContent
  typealias Output = String
  let name: String
  let description: String
  let parameters: GenerationSchema
  let capture: ToolCapture

  func call(arguments: GeneratedContent) async throws -> String {
    await capture.set(name, arguments.jsonString)
    throw Captured()
  }
}

// MARK: - Handlers

func health() -> [String: Any] {
  switch SystemLanguageModel.default.availability {
  case .available: return ["available": true, "model": "apple-foundation"]
  case .unavailable(let reason): return ["available": false, "reason": String(describing: reason)]
  }
}

func generate(_ body: [String: Any]) async -> [String: Any] {
  let call = Call(body)
  do {
    if !call.tools.isEmpty {
      let capture = ToolCapture()
      let tools: [any Tool] = try call.tools.map { t in
        let name = (t["name"] as? String) ?? "tool"
        let params = (t["parameters"] as? [String: Any]) ?? ["type": "object", "properties": [String: Any]()]
        return BridgeTool(name: name, description: (t["description"] as? String) ?? name, parameters: try generationSchema(params, name: name), capture: capture)
      }
      let session = LanguageModelSession(tools: tools, instructions: call.instructions)
      do {
        let r = try await session.respond(to: call.prompt, options: call.options)
        return ["text": r.content]
      } catch {
        if let c = await capture.call { return ["toolCall": ["name": c.name, "input": c.input]] }
        throw error
      }
    }
    let session = LanguageModelSession(instructions: call.instructions)
    if let schema = call.schema {
      let r = try await session.respond(to: call.prompt, schema: try generationSchema(schema, name: "Output"), includeSchemaInPrompt: true, options: call.options)
      return ["json": r.content.jsonString]
    }
    let r = try await session.respond(to: call.prompt, options: call.options)
    return ["text": r.content]
  } catch {
    log("generate failed: \(error)")
    return errorBody(error)
  }
}

func stream(_ body: [String: Any], send: @escaping (Data) -> Void) async {
  let call = Call(body)
  let session = LanguageModelSession(instructions: call.instructions)
  var sent = ""
  do {
    for try await snapshot in session.streamResponse(to: call.prompt, options: call.options) {
      // Snapshots are cumulative; forward only what is new.
      let full = snapshot.content
      if full.hasPrefix(sent) {
        let delta = String(full.dropFirst(sent.count))
        if !delta.isEmpty { send(jsonData(["delta": delta]) + Data("\n".utf8)) }
      } else {
        send(jsonData(["replace": full]) + Data("\n".utf8))
      }
      sent = full
    }
    send(jsonData(["done": true]) + Data("\n".utf8))
  } catch {
    log("stream failed: \(error)")
    send(jsonData(errorBody(error)) + Data("\n".utf8))
  }
}

func embed(_ body: [String: Any]) -> [String: Any] {
  let values = (body["values"] as? [String]) ?? []
  guard let model = NLEmbedding.sentenceEmbedding(for: .english) else {
    return ["error": ["kind": "unavailable", "message": "No sentence embedding on this Mac."]]
  }
  let vectors = values.map { model.vector(for: $0) ?? Array(repeating: 0, count: model.dimension) }
  return ["embeddings": vectors, "dimension": model.dimension]
}

// MARK: - A tiny HTTP/1.1 server (one request per connection)

func log(_ message: String) {
  let t = ISO8601DateFormatter().string(from: Date())
  FileHandle.standardError.write(Data("[\(t)] \(message)\n".utf8))
}

struct Request {
  let method: String
  let path: String
  let body: [String: Any]
}

func parse(_ data: Data) -> Request? {
  guard let end = data.range(of: Data("\r\n\r\n".utf8)) else { return nil }
  let head = String(decoding: data[..<end.lowerBound], as: UTF8.self)
  let lines = head.components(separatedBy: "\r\n")
  let first = lines.first?.split(separator: " ") ?? []
  guard first.count >= 2 else { return nil }
  var length = 0
  for line in lines.dropFirst() {
    let parts = line.split(separator: ":", maxSplits: 1)
    if parts.count == 2, parts[0].lowercased() == "content-length" { length = Int(parts[1].trimmingCharacters(in: .whitespaces)) ?? 0 }
  }
  let bodyStart = end.upperBound
  guard data.count - bodyStart >= length else { return nil }
  let raw = data[bodyStart..<(bodyStart + length)]
  let body = (try? JSONSerialization.jsonObject(with: raw)) as? [String: Any] ?? [:]
  return Request(method: String(first[0]), path: String(first[1]), body: body)
}

func head(_ status: String, _ type: String, length: Int?) -> Data {
  var h = "HTTP/1.1 \(status)\r\nContent-Type: \(type)\r\nCache-Control: no-cache\r\nConnection: close\r\n"
  if let length { h += "Content-Length: \(length)\r\n" }
  return Data((h + "\r\n").utf8)
}

func respond(_ conn: NWConnection, _ value: [String: Any], status: String = "200 OK") {
  let body = jsonData(value)
  conn.send(content: head(status, "application/json", length: body.count) + body, isComplete: true, completion: .contentProcessed { _ in conn.cancel() })
}

func handle(_ conn: NWConnection, _ req: Request) {
  log("\(req.method) \(req.path)")
  switch (req.method, req.path) {
  case ("GET", "/health"):
    respond(conn, health())
  case ("POST", "/generate"):
    Task { respond(conn, await generate(req.body)) }
  case ("POST", "/embed"):
    respond(conn, embed(req.body))
  case ("POST", "/stream"):
    conn.send(content: head("200 OK", "application/x-ndjson", length: nil), completion: .contentProcessed { _ in })
    Task {
      await stream(req.body) { chunk in conn.send(content: chunk, completion: .contentProcessed { _ in }) }
      conn.send(content: nil, isComplete: true, completion: .contentProcessed { _ in conn.cancel() })
    }
  default:
    respond(conn, ["error": ["kind": "unknown", "message": "No route \(req.method) \(req.path)"]], status: "404 Not Found")
  }
}

func receive(_ conn: NWConnection, _ buffer: Data = Data()) {
  conn.receive(minimumIncompleteLength: 1, maximumLength: 1 << 20) { data, _, done, error in
    var buf = buffer
    if let data { buf.append(data) }
    if let req = parse(buf) {
      handle(conn, req)
    } else if done || error != nil {
      conn.cancel()
    } else {
      receive(conn, buf)
    }
  }
}

let params = NWParameters.tcp
params.requiredLocalEndpoint = NWEndpoint.hostPort(host: "127.0.0.1", port: NWEndpoint.Port(rawValue: port)!)
params.allowLocalEndpointReuse = true
let listener = try NWListener(using: params)
listener.newConnectionHandler = { conn in
  conn.start(queue: .global())
  receive(conn)
}
listener.stateUpdateHandler = { state in
  if case .ready = state {
    let h = health()
    log("Ondai Mac bridge on http://127.0.0.1:\(port) · Apple model: \((h["available"] as? Bool) == true ? "ready" : "unavailable (\(h["reason"] ?? "?"))")")
  }
  if case .failed(let e) = state {
    log("listener failed: \(e)")
    exit(1)
  }
}
listener.start(queue: .main)
dispatchMain()
