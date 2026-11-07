import { Redirect } from 'expo-router';
// The real home (S08) arrives in M1; until then the app opens on the design system.
export default function Index() { return <Redirect href="/design" />; }
