import { useSuiClientQuery } from '@mysten/dapp-kit';
import type { MusicObject } from '@/services/sui/types';
import { mistToSui } from '@/services/sui/metadata';

export function useMusic(musicId: string) {
  return useSuiClientQuery('getObject', {
    id: musicId,
    options: {
      showContent: true,
      showType: true,
      showOwner: true,
    },
  });
}

export function parseMusic(obj: any): MusicObject | null {
  if (!obj?.data?.content?.fields) return null;
  
  const fields = obj.data.content.fields;
  
  return {
    id: obj.data.objectId,
    creator: fields.creator,
    audio_cid: fields.audio_cid,
    preview_cid: fields.preview_cid,
    metadata_uri: fields.metadata_uri,
    cover_uri: fields.cover_uri,
    parent: fields.parent?.fields?.id || null,
    total_listens: parseInt(fields.total_listens || '0'),
    revenue_pool: mistToSui(fields.revenue_pool || '0'),
    royalty_bps: Number(fields.royalty_bps),
    status: Number(fields.status),
    version: fields.version,
  };
}
