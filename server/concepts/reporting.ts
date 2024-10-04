import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

export interface ReportDoc extends BaseDoc {
  item: ObjectId;
  info: string;
}

/**
 * concept: Reporting [Item]
 * Purpose - users can notify administrators about inappropriate content on the app
 * Operational Principle - after a user reports an item, and optionally provides additional
 * information, administrators will see that item and address it.
 */
export default class ReportingConcept {
  public readonly reports: DocCollection<ReportDoc>;

  /**
   * Make an instance of Badging.
   */
  constructor(collectionName: string) {
    this.reports = new DocCollection<ReportDoc>(collectionName);
  }

  async create(item: ObjectId, info?: string) {
    const _id = await this.reports.createOne({ item, info });
    return { msg: "Report successfully created!", report: await this.reports.readOne({ _id }) };
  }

  async getReports() {
    // Returns all reports! You might want to page for better client performance
    return await this.reports.readMany({}, { sort: { _id: -1 } });
  }

  async address(_id: ObjectId, validity: Boolean) {
    const report = await this.reports.readOne({ _id });
    if (!report) {
      throw new NotFoundError(`Report ${_id} does not exist!`);
    }

    await this.reports.deleteOne({ _id });
    return { msg: "Report addressed successfully!" };
  }
}
