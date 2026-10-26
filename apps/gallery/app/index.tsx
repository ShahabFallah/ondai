import { Redirect } from 'expo-router'

/** Dev switches: EXPO_PUBLIC_ONDAI_INITIAL_ROUTE=/component/command-bar or EXPO_PUBLIC_ONDAI_AUTORUN=1 (Device tab + spike). */
const initial = process.env.EXPO_PUBLIC_ONDAI_INITIAL_ROUTE ?? (process.env.EXPO_PUBLIC_ONDAI_AUTORUN === '1' ? '/(tabs)/device' : '/(tabs)')

export default function Index() {
  return <Redirect href={initial as never} />
}
