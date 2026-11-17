import { QUEUES } from '@madar/contracts';
import { PgBoss } from 'pg-boss';

export async function startQueue(
  connectionString: string,
  onError: (error: Error) => void = () => {},
) {
  const boss = new PgBoss({ connectionString, schema: 'pgboss', application_name: 'madar-queue' });
  boss.on('error', onError);
  await boss.start();
  await boss.createQueue(QUEUES.dead, { retentionSeconds: 604800 });
  await boss.createQueue(QUEUES.collect, {
    policy: 'exclusive',
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
    retryDelayMax: 300,
    expireInSeconds: 120,
    retentionSeconds: 86400,
    deadLetter: QUEUES.dead,
  });
  return boss;
}
export function enqueueSource(boss: PgBoss, sourceId: string) {
  return boss.send(QUEUES.collect, { sourceId }, { singletonKey: sourceId });
}
