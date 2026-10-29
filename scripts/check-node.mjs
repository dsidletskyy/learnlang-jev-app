const major = Number(process.versions.node.split('.')[0]);
if (major !== 24) {
  console.error(`Node.js 24 LTS is required; found ${process.version}.`);
  process.exit(1);
}
