import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Badging, Blurring, Commenting, Friending, Liking, Posting, Reporting, Sessioning } from "./app";
import { BadgeType, BadgeTypes } from "./concepts/badging";
import { PostOptions } from "./concepts/posting";
import { SessionDoc } from "./concepts/sessioning";
import Responses from "./responses";

import { z } from "zod";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Synchronize the concepts from `app.ts`.

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password);
  }

  @Router.get("/admins")
  async getAdmins() {
    return await Authing.getAdmins();
  }

  @Router.post("/admins")
  async createAdmin(session: SessionDoc, username: string, password: string) {
    const user = Sessioning.getUser(session);
    await Authing.assertUserIsAdmin(user);
    return await Authing.createAdmin(username, password);
  }

  @Router.delete("/admins/:id")
  async adminDeleteItem(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    await Authing.assertUserIsAdmin(user);
    const oid = new ObjectId(id);
    await Posting.delete(oid);
    await Commenting.delete(oid);
    await Authing.delete(oid);
    return { msg: "Successfully deleted" };
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthor(id);
    } else {
      posts = await Posting.getPosts();
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: SessionDoc, image: string, caption: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const created = await Posting.create(user, image, caption, options);
    await Liking.initItem(created.post!._id);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:id")
  async updatePost(session: SessionDoc, id: string, content?: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return await Posting.update(oid, content, options);
  }

  @Router.delete("/posts/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return Posting.delete(oid);
  }

  @Router.get("/friends")
  async getFriends(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.idsToUsernames(await Friending.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(friend))._id;
    return await Friending.removeFriend(user, friendOid);
  }

  @Router.get("/friend/requests")
  async getRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Responses.friendRequests(await Friending.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.sendRequest(user, toOid);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.removeRequest(user, toOid);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.acceptRequest(fromOid, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.rejectRequest(fromOid, user);
  }

  @Router.get("/badges")
  async getBadges(user: string) {
    const author = (await Authing.getUserByUsername(user))._id;
    return await Badging.getByAuthor(author);
  }

  @Router.post("/badges")
  async giveBadge(session: SessionDoc, user: string, type: string) {
    const admin = Sessioning.getUser(session);
    await Authing.assertUserIsAdmin(admin);
    const oid = new ObjectId(user);
    return await Badging.give(oid, type as BadgeType);
  }

  @Router.delete("/badges/:id")
  async deleteBadge(session: SessionDoc, id: string) {
    const oid = new ObjectId(id);
    const badge = await Badging.getBadge(oid);
    const type = badge?.type;
    if (type === BadgeTypes.SHAME) {
      const user = Sessioning.getUser(session);
      await Authing.assertUserIsAdmin(user);
      return await Badging.remove(oid);
    } else return await Badging.remove(oid);
  }

  @Router.get("/reports")
  async getReports(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    await Authing.assertUserIsAdmin(user);
    return await Reporting.getReports();
  }

  @Router.post("/reports")
  async createReport(id: string, info: string) {
    const oid = new ObjectId(id);
    return await Reporting.create(oid, info);
  }

  @Router.delete("/reports")
  async addressReport(session: SessionDoc, id: string, validity: string) {
    const user = Sessioning.getUser(session);
    await Authing.assertUserIsAdmin(user);
    const oid = new ObjectId(id);
    const report = await Reporting.getReport(oid);
    const itemId = report!.item;
    const post = await Posting.getPost(itemId);
    const comment = await Commenting.getComment(itemId);
    const author = post ? post.author : comment ? comment.author : undefined;
    if (validity.toLowerCase() === "true") {
      await Badging.give(author!, BadgeTypes.SHAME);
      const likers = await Liking.getItemLikers(itemId);
      await Promise.all(likers.map((liker) => Badging.give(liker, BadgeTypes.SHAME)));
      await Posting.delete(itemId);
      await Commenting.delete(itemId);
    }
    return await Reporting.remove(oid);
  }

  @Router.get("/filters")
  async getFilters(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Blurring.getFilters(user);
  }

  @Router.post("/filters")
  async addFilter(session: SessionDoc, filterUser: string) {
    const user = Sessioning.getUser(session);
    const someUser = new ObjectId(filterUser);
    return await Blurring.addFilter(user, someUser);
  }

  @Router.delete("/filters/:id")
  async deleteFilter(session: SessionDoc, filterUser: string) {
    const user = Sessioning.getUser(session);
    const someUser = new ObjectId(filterUser);
    return await Blurring.removeFilter(user, someUser);
  }

  @Router.post("/blur")
  async blur(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const postId = new ObjectId(id);
    const post = await Posting.getPost(postId);
    if (post) {
      const inFilter = await Blurring.inFilter(user, post.author);
      return inFilter ? await Blurring.blur(post.image) : post.image;
    }
  }

  @Router.post("/blur/:intensity")
  async changeIntensity(id: string, intensity: string) {
    const postId = new ObjectId(id);
    const blurIntensity = Number(intensity);
    const post = await Posting.getPost(postId);
    if (post) {
      return await Blurring.blur(post.image, blurIntensity);
    }
  }

  @Router.get("/comments")
  async getItemComments(item?: string) {
    if (item) {
      const oid = new ObjectId(item);
      return await Commenting.getItemComments(oid);
    } else return await Commenting.getComments();
  }

  @Router.post("/comments")
  async createComment(session: SessionDoc, item: string, content: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(item);
    return await Commenting.create(user, oid, content);
  }

  @Router.delete("/comments/:id")
  async deleteComment(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Commenting.assertAuthorIsUser(oid, user);
    return Commenting.delete(oid);
  }

  @Router.get("/likes/items")
  async getItemLikes(item: string) {
    const oid = new ObjectId(item);
    return await Liking.getItemLikeCount(oid);
  }

  @Router.get("/likes/users")
  async getUserLikes(id: string) {
    const oid = new ObjectId(id);
    return await Liking.getUserLikes(oid);
  }

  @Router.post("/likes")
  async addLike(session: SessionDoc, item: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(item);
    return await Liking.like(user, oid);
  }

  @Router.delete("/likes/:id")
  async removeLike(session: SessionDoc, item: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(item);
    return await Liking.unlike(user, oid);
  }
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
