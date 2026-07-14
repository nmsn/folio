import { View, Text, ScrollView } from 'react-native'
import { useArticle } from '../hooks/useArticle'

export function ArticleScreen({ route }: any) {
  const { id } = route.params
  const { data: article, isLoading } = useArticle(id)

  if (isLoading) return <Text>Loading...</Text>

  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Text className="text-2xl font-bold mb-2">{article?.title}</Text>
      <Text className="text-sm text-muted-foreground mb-4">
        {article?.author} •{' '}
        {article?.publishedAt ? new Date(article.publishedAt).toLocaleString() : ''}
      </Text>
      <Text className="text-base">{article?.content || article?.description}</Text>
    </ScrollView>
  )
}
