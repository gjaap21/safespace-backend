import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface CommentDoc extends BaseDoc {
  author: ObjectId;
  item: ObjectId;
  content: string;
}

/**
 * concept: Commenting [Author, Item]
 * Purpose - users can comment in reply to other items
 * Operational Principle - after making a comment on an item, when a user brings up that
 * item, the comment is also included
 */
export default class CommentingConcept {
  public readonly comments: DocCollection<CommentDoc>;

  /**
   * Make an instance of Commenting.
   */
  constructor(collectionName: string) {
    this.comments = new DocCollection<CommentDoc>(collectionName);
  }

  async create(author: ObjectId, item: ObjectId, content: string) {
    const _id = await this.comments.createOne({ author, item, content });
    return { msg: "Comment successfully created!", comment: await this.comments.readOne({ _id }) };
  }

  async getComment(_id: ObjectId) {
    return await this.comments.readOne({ _id });
  }

  async getComments() {
    return await this.comments.readMany({}, { sort: { _id: -1 } });
  }

  async getItemComments(item: ObjectId) {
    return await this.comments.readMany({ item }, { sort: { _id: -1 } });
  }

  async delete(_id: ObjectId) {
    await this.comments.deleteOne({ _id });
    return { msg: "Comment deleted successfully!" };
  }

  async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
    const comment = await this.comments.readOne({ _id });
    if (!comment) {
      throw new NotFoundError(`Comment ${_id} does not exist!`);
    }
    if (comment.author.toString() !== user.toString()) {
      throw new CommentAuthorNotMatchError(user, _id);
    }
  }

  // Realized displaying is more of a front-end thing but might want this code later so leaving it
  //   async displayPostComments(commentsId: CommentDoc[]) {
  //     const comments = commentsId.map((comment) => `${comment.author}: ${comment.content}`);
  //     const commentsContainer = document.getElementById("commentsContainer");
  //     if (commentsContainer) {
  //       commentsContainer.innerHTML = "";
  //       comments.forEach((comment) => {
  //         const commentElement = document.createElement("p");
  //         commentElement.innerText = comment;
  //         commentsContainer.appendChild(commentElement);
  //       });
  //     }
  //   }
}

export class CommentAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of comment {1}!", author, _id);
  }
}
