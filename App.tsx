import { BASE_URL } from './src/api';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  console.log(BASE_URL)
  return <AppNavigator />;
}
