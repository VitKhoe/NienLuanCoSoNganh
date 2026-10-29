// Quan hệ bạn bè của người đang đăng nhập với những người khác

import { fetchConnections } from './api.js';

// Trả về Map: idUser -> 'friend' (đã là bạn) | 'incoming' (họ gửi lời mời cho mình) | 'outgoing' (mình đã gửi lời mời)
export async function loadRelations() {
  const [friends, incoming, outgoing] = await Promise.all([
    fetchConnections('friends'),
    fetchConnections('incoming'),
    fetchConnections('outgoing')
  ]);

  const relations = new Map();
  friends.forEach((person) => relations.set(person.idUser, 'friend'));
  incoming.forEach((person) => relations.set(person.idUser, 'incoming'));
  outgoing.forEach((person) => relations.set(person.idUser, 'outgoing'));
  return relations;
}
