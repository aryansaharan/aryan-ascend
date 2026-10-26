// Every localStorage key Ascend uses (spec 6.1, addendum-ai), in one place.

/** ProfileV2 draft from /assess */
export const PROFILE_KEY = "ascend.profile.v2";
/** { [decisionKey]: Decision }, 10 most recent */
export const DECISION_KEY = "ascend.decision.v2";
/** { [planId]: PlanPayloadV2 } */
export const PLANS_KEY = "ascend.plans.v2";
/** planId of the newest saved plan */
export const LATEST_PLAN_KEY = "ascend.plans.latest";
/** { firstSessionDoneAt?, weeksDone[] } per plan; progress never goes in the URL */
export const progressKey = (planId: string) => `ascend.progress.${planId}`;
/** { [situationKey]: UnderstandResponse }, 3 most recent; the "Read your situation" panel reads it */
export const UNDERSTAND_KEY = "ascend.understand.v2";
/** { [tailorKey]: TailorResponse }, 3 most recent; avoids a second tailor call for the same plan */
export const TAILOR_KEY = "ascend.tailor.v2";
/** { [profileKey]: re-picks used }, 10 most recent; outlives the 10-entry decision cache so the limit holds */
export const REPICKS_KEY = "ascend.repicks.v2";
