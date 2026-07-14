import { View, Text, TouchableOpacity } from 'react-native'

export function SettingsScreen() {
  return (
    <View className="flex-1 bg-background p-4">
      <Text className="text-xl font-bold mb-4">Settings</Text>
      <TouchableOpacity className="p-4 bg-secondary rounded mb-2">
        <Text>Account</Text>
      </TouchableOpacity>
      <TouchableOpacity className="p-4 bg-secondary rounded">
        <Text>About</Text>
      </TouchableOpacity>
    </View>
  )
}
