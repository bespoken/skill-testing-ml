const readPackage = () => parseVersion(require("./package.json").version)

const parseVersion = (version) => {
  const versionParts = version.split(/[\.]/ig)
  const major = parseInt(versionParts[0])
  const minor = parseInt(versionParts[1])
  const patchParts = versionParts.slice(2).join(".").split(/\-RC\./ig)
  const patch = parseInt(patchParts[0])
  const rc = patchParts.length > 1 ? parseInt(patchParts[1]) : null

  const release = `${major}.${minor}.${Math.max(patch, 0)}`
  const newRelease = `${major}.${minor}.${Math.max(patch, 0) + 1}`
  const candidate = `${major}.${minor}.${patch}-RC.${Math.max(rc, 0) + 1}`
  return { release, newRelease, candidate, currentVersion: version }
}

const printNextRcVersion = () => console.log(readPackage().candidate)
const printNextReleaseVersion = () => console.log(readPackage().newRelease)
const printReleaseVersion = () => console.log(readPackage().release)
const printCurrentVersion = () => console.log(readPackage().currentVersion)



module.exports = { parseVersion, readPackage, printNextRcVersion, printReleaseVersion, printCurrentVersion, printNextReleaseVersion }