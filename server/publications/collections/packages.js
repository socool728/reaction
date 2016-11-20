import {Packages} from "/lib/collections";
import {Reaction, Logger} from "/server/api";
import {translateRegistry} from "/lib/api";

/**
 * Packages contains user specific configuration
 * @summary  package publication settings, filtered by permissions
 * @param {Object} shopCursor - current shop object
 * @returns {Object} packagesCursor - current packages for shop
 */


// for transforming packages before publication
// sets some defaults for the client and adds i18n
// while checking priviledged settings for enabled status.
function transform(doc) {
  if (doc.name === "reaction-shipping") {
    console.log(doc);
  }
  if (doc.registry) {
    for (registry of doc.registry) {
      // add some normalized defaults
      registry.packageId = doc._id;
      registry.packageName = registry.packageName || doc.name;
      // registry.icon = registry.icon || doc.icon;
      // registry.enabled = registry.enabled || ""; // default state
      registry.settingsKey = (registry.name || doc.name).split("/").splice(-1)[0];
      // add i18n keys
      registry = translateRegistry(registry, doc);
      if (doc.name === "reaction-shipping") {
        console.log("translated", doc)
      }
      // set package enabled to settings.enabled status
      if (doc.settings && doc.settings[registry.settingsKey]) {
        registry.enabled = doc.settings[registry.settingsKey].enabled;
        Logger.info(`Set enabled ${registry.settingsKey} as ${registry.enabled}`);
      }
    }
  }
  Logger.debug(`Transforming and publishing ${doc.name} as ${doc.enabled}`);
  return doc;
}

//
//  Packages Publication
//
Meteor.publish("Packages", function (shopCursor) {
  check(shopCursor, Match.Optional(Object));
  const self = this;
  const shop = shopCursor || Reaction.getCurrentShop();

  // user is required.
  if (this.userId === null) {
    return this.ready();
  }

  // default options, we're limiting fields here
  // that we don't want to publish unless admin user.
  // in particular, settings should not be published
  let options = {
    fields: {
      "shopId": 1,
      "name": 1,
      "enabled": 1,
      "registry": 1,
      "layout": 1,
      "settings.general.enabled": 1, // todo: deprecate settings.general
      "settings.public": 1,
      "icon": 1
    }
  };

  // we should always have a shop
  if (shop) {
    // if admin user, return all shop properties
    if (Roles.userIsInRole(this.userId, [
      "dashboard", "owner", "admin"
    ], Reaction.getShopId() || Roles.userIsInRole(this.userId, [
      "owner", "admin"
    ], Roles.GLOBAL_GROUP))) {
      options = {};
    }
    // observe and transform Package registry adds i18n and other meta data
    const observer = Packages.find({
      shopId: shop._id
    }, options).observe({
      added: function (doc) {
        self.added("Packages", doc._id, transform(doc));
      },
      changed: function (newDoc, origDoc) {
        self.changed("Packages", origDoc._id, transform(newDoc));
      },
      removed: function (origDoc) {
        self.removed("Packages", origDoc._id);
      }
    });

    self.onStop(function () {
      observer.stop();
    });
  }

  return self.ready();
});
