import { Redirect } from 'expo-router'
export default function Index() {
  return <Redirect href={process.env.EXPO_PUBLIC_ONDAI_AUTORUN === '1' ? '/(tabs)/device' : '/(tabs)'} />
}
