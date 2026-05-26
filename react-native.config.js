/**
 * React Native CLI configuration.
 *
 * We pin the Android package name so the Gradle autolinking model uses the
 * correct BuildConfig package (used by the generated entry point).
 */
module.exports = {
  project: {
    android: {
      packageName: "inventory.enviromasternva.com",
    },
  },
};

