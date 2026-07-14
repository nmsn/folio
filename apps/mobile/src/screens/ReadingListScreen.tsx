import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { useReadingList } from '../hooks/useReadingList'

export function ReadingListScreen({ navigation }: any) {
  const { data: items } = useReadingList()

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          className="p-4 border-b border-border"
          onPress={() => navigation.navigate('Article', { id: item.article_id })}
        >
          <Text className="font-semibold">{item.title}</Text>
          <Text className="text-sm text-muted-foreground">Status: {item.status}</Text>
        </TouchableOpacity>
      )}
    />
  )
}
