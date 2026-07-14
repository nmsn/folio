import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { useFeeds } from '../hooks/useFeeds'

export function FeedListScreen({ navigation }: any) {
  const { data: feeds, isLoading } = useFeeds()

  if (isLoading) return <Text>Loading...</Text>

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={feeds}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="p-4 border-b border-border"
            onPress={() => navigation.navigate('Article', { id: item.id })}
          >
            <Text className="text-lg font-semibold">{item.name}</Text>
            <Text className="text-sm text-muted-foreground">{item.description}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}
