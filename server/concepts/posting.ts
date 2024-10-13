import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface PostOptions {
  backgroundColor?: string;
}

export interface PostDoc extends BaseDoc {
  author: ObjectId;
  image: string;
  caption: string;
  options?: PostOptions;
}

/**
 * concept: Posting [Author]
 */
export default class PostingConcept {
  public readonly posts: DocCollection<PostDoc>;

  /**
   * Make an instance of Posting.
   */
  constructor(collectionName: string) {
    this.posts = new DocCollection<PostDoc>(collectionName);
  }

  async create(author: ObjectId, image: string, caption: string, options?: PostOptions) {
    const url = this.getImageURL(image);
    const _id = await this.posts.createOne({ author, image: url, caption, options });
    return { msg: "Post successfully created!", post: await this.posts.readOne({ _id }) };
  }

  async getPost(_id: ObjectId) {
    return await this.posts.readOne({ _id });
  }

  async getPosts() {
    // Returns all posts! You might want to page for better client performance
    return await this.posts.readMany({}, { sort: { _id: -1 } });
  }

  async getByAuthor(author: ObjectId) {
    return await this.posts.readMany({ author });
  }

  async update(_id: ObjectId, caption?: string, options?: PostOptions) {
    // Note that if content or options is undefined, those fields will *not* be updated
    // since undefined values for partialUpdateOne are ignored.
    await this.posts.partialUpdateOne({ _id }, { caption, options });
    return { msg: "Post successfully updated!" };
  }

  async delete(_id: ObjectId) {
    await this.posts.deleteOne({ _id });
    return { msg: "Post deleted successfully!" };
  }

  // Converts a regular viewing link that Google Drive gives users into a direct viewing link
  private getImageURL(url: string) {
    const regex = /(?:\/d\/|id=)([^\/?]+)/;
    const matches = url.match(regex);
    const fileId = matches ? matches[1] : null;
    if (fileId === null) throw new NotFoundError("Image link is not in the appropriate format.");
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
    const post = await this.posts.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    if (post.author.toString() !== user.toString()) {
      throw new PostAuthorNotMatchError(user, _id);
    }
  }

  // Realized displaying is more of a front-end thing but might want this code later so leaving it
  // async displayPostContent(canvas: HTMLCanvasElement, post: PostDoc) {
  //   const container = document.getElementById("canvasContainer");
  //   if (container) {
  //     container.appendChild(canvas);
  //   }

  //   const captionContainer = document.getElementById("captionContainer");
  //   if (captionContainer) {
  //     captionContainer.innerText = post.caption;
  //   }
  // }
}

export class PostAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of post {1}!", author, _id);
  }
}
