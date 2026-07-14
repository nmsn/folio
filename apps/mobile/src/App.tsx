import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { FeedListScreen } from './screens/FeedListScreen'
import { ArticleScreen } from './screens/ArticleScreen'
import { ReadingListScreen } from './screens/ReadingListScreen'
import { SettingsScreen } from './screens/SettingsScreen'

const Stack = createNativeStackNavigator()
const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator>
          <Stack.Screen name="Feeds" component={FeedListScreen} />
          <Stack.Screen name="Article" component={ArticleScreen} />
          <Stack.Screen name="ReadingList" component={ReadingListScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  )
}
