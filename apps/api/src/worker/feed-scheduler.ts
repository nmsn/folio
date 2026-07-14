import PgBoss from 'pg-boss'

const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  interval: 60, // 1 minute default retry interval
})

export async function startFeedScheduler() {
  await boss.start()

  // Schedule feed refresh every minute
  await boss.schedule('feed-refresh-scheduler', '* * * * *')

  boss.on('error', (error) => console.error('pg-boss error:', error))

  return boss
}

export { boss }
