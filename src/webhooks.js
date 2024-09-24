const discord = require("discord.js");
const core = require("@actions/core");
const MAX_MESSAGE_LENGTH = 256;

function capStringLength(str, maxLength) {
  if (str.length > maxLength) {
    return str.substring(0, maxLength);
  } else {
    return str;
  }
}

module.exports.send = (
  webhookUrl,
  payload,
  hideLinks,
  color,
  hasError,
) => {
  const commits = payload.commits;
  const size = commits.length;
  const url = payload.compare;

  if (commits.length === 0) {
    core.warning(`Aborting analysis, found no commits.`);
    return Promise.resolve();
  }

  core.debug(`Received payload: ${JSON.stringify(payload, null, 2)}`);
  core.debug(`Received ${commits.length}/${size} commits...`);
  core.info("Constructing Embed...");

  let latest = commits[0];
  const count = size == 1 ? "Commit" : " Commits";

  let firstCommitMessage =  
  commits[0].message.length > MAX_MESSAGE_LENGTH
    ? commits[0].message.substring(0, MAX_MESSAGE_LENGTH) + "..."
    : commits[0].message;

    let good = `⚡ ${commits[0].author.username}`;
    let bad = `❌ [TEST FAILURE] ${commits[0].author.username}`;

  let embed = new discord.MessageEmbed()
    .setColor(color)
    .setTitle(capStringLength(`${hasError == 'true' ? bad : good}: ${firstCommitMessage}`, 255))
    .setDescription(this.getChangeLog(payload, hasError))
    .setTimestamp(Date.parse(latest.timestamp));

  if (!hideLinks) {
    embed.setURL(url);
  }

  return new Promise((resolve, reject) => {
    let client;
    core.info("Preparing Discord webhook client...");

    try {
      client = new discord.WebhookClient({ url: webhookUrl });
    } catch (error) {
      reject(error);
    }

    core.info("Sending webhook message...");

    return client
      .send({
        embeds: [embed],
      })
      .then((result) => {
        core.info("Successfully sent the message!");
        resolve(result);
      })
      .catch((error) => reject(error));
  });
};

module.exports.getChangeLog = (payload, hasError) => {
  core.info("Constructing Changelog...");
  const commits = payload.commits;
  let changelog = "";

  if (hasError == 'true') {
    changelog += "TEST FAILURE\n";
  }

  for (let i in commits) {
    if (i > 3) {
      changelog += `+ ${commits.length - i} more...\n`;
      break;
    }

    let commit = commits[i];
    const username = commit.author.username;

    let sha = commit.id.substring(0, 6);
    let message =
      commit.message.length > MAX_MESSAGE_LENGTH
        ? commit.message.substring(0, MAX_MESSAGE_LENGTH) + "..."
        : commit.message;
        let modified = commit.modified ? `Modified: \n  ${commit.modified.join('\n  ')}\n` : '';
        let deleted = commit.modified ? `Deleted: \n  ${commit.deleted.join('\n  ')}\n` : '';
        let added = commit.added ? `Added: \n  ${commit.added.join('\n  ')}\n` : '';
    changelog +=  `
      \`${sha}\` ${message}  by _@${username}_
      ${commit.url}
${added}${modified}${deleted}`;
  }

  return changelog;
};
