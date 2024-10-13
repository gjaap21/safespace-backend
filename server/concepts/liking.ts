import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";

export interface LikingDoc extends BaseDoc {
  user: ObjectId;
  item: ObjectId;
  quantity: number;
}

/**
 * concept: Liking [User, Item]
 * Purpose - users can keep track of items that they like
 * Operational Principle - after the user likes an item, they will be able to find it again
 * in a list of liked items
 */
export default class LikingConcept {
  public readonly userLikes: DocCollection<LikingDoc>;
  public readonly itemLikes: DocCollection<LikingDoc>;

  /**
   * Make an instance of Liking.
   */
  constructor(collectionName: string) {
    this.userLikes = new DocCollection<LikingDoc>(collectionName);
    this.itemLikes = new DocCollection<LikingDoc>(collectionName);
  }

  // Initializes an item with 0 likes
  async initItem(item: ObjectId) {
    return await this.itemLikes.createOne({ item, quantity: 0 });
  }

  async like(user: ObjectId, item: ObjectId) {
    // Check if already liked
    const check = await this.userLikes.readOne({ user, item });
    const _id = check ? check._id : await this.userLikes.createOne({ user, item });

    if (!check) {
      const _item = await this.itemLikes.readOne({ item });
      _item ? await this.itemLikes.partialUpdateOne({ item }, { quantity: _item.quantity + 1 }) : await this.itemLikes.createOne({ item, quantity: 1 });
    }

    return { msg: "Successfully liked!", like: await this.userLikes.readOne({ _id }) };
  }

  async getItemLikeCount(item: ObjectId) {
    const _item = await this.itemLikes.readOne({ item });
    return _item?.quantity;
  }

  async getUserLikes(user: ObjectId) {
    return await this.userLikes.readMany({ user });
  }

  async getItemLikers(item: ObjectId) {
    const likeDocs = await this.userLikes.readMany({ item });
    return likeDocs.map((like) => like.user);
  }

  async unlike(user: ObjectId, item: ObjectId) {
    const userLike = await this.userLikes.readOne({ user, item });
    let _id = userLike?._id;
    await this.userLikes.deleteOne({ _id });
    const itemLike = await this.itemLikes.readOne({ item });
    _id = itemLike?._id;
    if (userLike) {
      await this.itemLikes.partialUpdateOne({ _id }, { quantity: itemLike!.quantity - 1 });
    }
    return { msg: "Successfully removed like!" };
  }
}
