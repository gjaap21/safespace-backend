import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export type BadgeType = "shame" | "verified"; // can add more later

const BadgeTypes: Record<string, BadgeType> = {
  SHAME: "shame",
  VERIFIED: "verified",
};

export interface BadgeDoc extends BaseDoc {
  author: ObjectId;
  type: BadgeType;
}

/**
 * concept: Badging [Author]
 * Purpose - users can have badges displayed on their profile
 * Operational Principle - once earned, a badge of the earned type will be displayed on the user’s
 * profile until removed.
 */
export default class BadgingConcept {
  public readonly badges: DocCollection<BadgeDoc>;

  /**
   * Make an instance of Badging.
   */
  constructor(collectionName: string) {
    this.badges = new DocCollection<BadgeDoc>(collectionName);
  }

  async give(author: ObjectId, type: BadgeType) {
    const _id = await this.badges.createOne({ author, type });
    return { msg: "Badge successfully created!", badge: await this.badges.readOne({ _id }) };
  }

  async getByAuthor(author: ObjectId) {
    return await this.badges.readMany({ author });
  }

  async remove(_id: ObjectId) {
    const badge = await this.badges.readOne({ _id });
    if (!badge) {
      throw new NotFoundError(`Badge ${_id} does not exist!`);
    } else if (badge.type === BadgeTypes.SHAME) {
      throw new NotAllowedError(`User cannot manually remove a badge of shame!`);
    }
    await this.badges.deleteOne({ _id });
    return { msg: "Badge deleted successfully!" };
  }
}
