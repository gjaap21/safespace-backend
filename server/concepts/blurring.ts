import { ObjectId } from "mongodb";

import { createCanvas, loadImage } from "canvas";
import DocCollection, { BaseDoc } from "../framework/doc";

export interface BlurDoc extends BaseDoc {
  user: ObjectId;
  filter: ObjectId;
}

/**
 * concept: Blurring [User, Item]
 * Purpose - users can choose to blur certain items and change the blur intensity
 * Operational Principle - item x will be blurred, if x is in filter, to a predefined
 * degree until the user changes the intensity
 */
export default class BlurringConcept {
  public readonly blurSettings: DocCollection<BlurDoc>;

  /**
   * Make an instance of Blurring.
   */
  constructor(collectionName: string) {
    this.blurSettings = new DocCollection<BlurDoc>(collectionName);
  }

  // Blurs the image provided at the specified URL to either the specified intensity or the
  // default intensity
  async blur(imageURL: string, intensity?: number) {
    const image = (await loadImage(imageURL)) as unknown as HTMLImageElement;
    image.src = imageURL;
    // Intensity can range from 0 to 20 using Canvas API and users provide a percentage
    const blurIntensity = intensity ? Math.min(Math.max(intensity / 5, 0), 20) : 20;
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D & { filter: string };

    // Have to draw the image before redrawing it with the blur filter
    ctx.drawImage(image, 0, 0);
    ctx.filter = `blur(${blurIntensity}px)`;
    ctx.drawImage(image, 0, 0);

    return canvas as unknown as HTMLCanvasElement;
  }

  // Checks if our user wants to filter otherUser's posts
  async inFilter(user: ObjectId, otherUser: ObjectId) {
    const filters = await this.getFilters(user);
    return filters.includes(otherUser.toString());
  }

  // Adds _filter to the filters of our user specified by _id
  async addFilter(user: ObjectId, filter: ObjectId) {
    const userSettings = await this.blurSettings.readOne({ user, filter });
    if (userSettings === null) {
      await this.blurSettings.createOne({ user, filter });
    }
    return { msg: "Filter successfully added!" };
  }

  async removeFilter(user: ObjectId, filter: ObjectId) {
    return await this.blurSettings.deleteOne({ user, filter });
  }

  async getFilters(user: ObjectId) {
    const userSettings = await this.blurSettings.readMany({ user });
    if (!userSettings) {
      return [];
    } else return userSettings.map((setting) => setting.filter.toString());
  }
}
