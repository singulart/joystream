import categories from '../flows/forum/categories'
import threads from '../flows/forum/threads'
import posts from '../flows/forum/posts'
import moderation from '../flows/forum/moderation'
import leadOpening from '../flows/working-groups/leadOpening'
import threadTags from '../flows/forum/threadTags'
import { scenario } from '../Scenario'

// eslint-disable-next-line @typescript-eslint/no-floating-promises
scenario('Forum', async ({ job }) => {
  const sudoHireLead = job('hiring working group leads', leadOpening())
  job('forum categories', categories).requires(sudoHireLead)
  job('forum threads', threads).requires(sudoHireLead)
  job('forum thread tags', threadTags).requires(sudoHireLead)
  job('forum posts', posts).requires(sudoHireLead)
  job('forum moderation', moderation).requires(sudoHireLead)
})
