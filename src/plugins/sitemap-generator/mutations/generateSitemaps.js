/**
 * @name sitemap/generateSitemaps
 * @memberof Mutations/Sitemap
 * @method
 * @summary Regenerates sitemap files for primary shop
 * @param {Object} context - GraphQL execution context
 * @param {String} input input of generateSitemaps
 * @param {String} input.shopId shopId to generate sitemap for
 * @returns {undefined} schedules immediate sitemap generation job
 */
export default async function generateSitemaps(context, input) {
  const { checkPermissions, userId } = context;
  const { shopId } = input;

  await checkPermissions(["admin"], shopId);

  const jobOptions = {
    type: "sitemaps/generate",
    data: { notifyUserId: userId, shopId }
  };

  // First cancel any existing job with same data. We can't use `cancelRepeats` option
  // on `scheduleJob` because that cancels all of that type, whereas we want to
  // cancel only those with the same type AND the same shopId and notify ID.
  await context.backgroundJobs.cancelJobs(jobOptions);

  await context.backgroundJobs.scheduleJob(jobOptions);
}
