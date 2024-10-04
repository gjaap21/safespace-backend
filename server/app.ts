import AuthenticatingConcept from "./concepts/authenticating";
import BadgingConcept from "./concepts/badging";
import FriendingConcept from "./concepts/friending";
import PostingConcept from "./concepts/posting";
import ReportingConcept from "./concepts/reporting";
import SessioningConcept from "./concepts/sessioning";

// The app is a composition of concepts instantiated here
// and synchronized together in `routes.ts`.
export const Sessioning = new SessioningConcept();
export const Authing = new AuthenticatingConcept("users");
export const Posting = new PostingConcept("posts");
export const Friending = new FriendingConcept("friends");
export const Badging = new BadgingConcept("badges");
export const Reporting = new ReportingConcept("reports");
