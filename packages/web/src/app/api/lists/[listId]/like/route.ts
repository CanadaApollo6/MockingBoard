import {
  handleLikeGet,
  handleLikePost,
  handleLikeDelete,
} from '@/lib/api/likes';

const LIKE_CONFIG = {
  likeCollection: 'listLikes',
  resourceCollection: 'lists',
  resourceKey: 'listId',
  label: 'List',
} as const;

interface RouteParams {
  params: Promise<{ listId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { listId } = await params;
  return handleLikeGet(listId, LIKE_CONFIG);
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { listId } = await params;
  return handleLikePost(listId, LIKE_CONFIG);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { listId } = await params;
  return handleLikeDelete(listId, LIKE_CONFIG);
}
