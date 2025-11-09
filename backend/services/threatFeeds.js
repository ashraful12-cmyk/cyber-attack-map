async function fetchAbuseIpDb() { /* your existing code */ }
async function fetchGreyNoise() { /* placeholder */ }
async function fetchOTX() { /* placeholder */ }

module.exports = async function aggregateFeeds() {
  const [a, b, c] = await Promise.allSettled([
    fetchAbuseIpDb(),
    fetchGreyNoise(),
    fetchOTX()
  ]);
  return [...(a.value || []), ...(b.value || []), ...(c.value || [])];
};
