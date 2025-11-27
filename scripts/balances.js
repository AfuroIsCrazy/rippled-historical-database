// Optimized and cleaned version using modern practices (axios, async/await).

const axios = require('axios');
const minimist = require('minimist');

// MARK: - Configuration
// It is recommended to load these from environment variables in production.
const DATA_API_URL = 'https://data.ripple.com/v2/ledgers';
const RPC_API_URL = 'https://s2.ripple.com:51234';

// Utility for pretty printing JSON output
function pretty(json) {
  return JSON.stringify(json, undefined, 2) + '\n';
}

/**
 * Executes the rippled 'gateway_balances' RPC command.
 * @param {string} account - The gateway account address.
 * @param {string} ledger - The ledger index to query.
 * @param {string[]} hotwallets - List of hot wallet addresses.
 */
async function getBalances(account, ledger, hotwallets) {
  try {
    const response = await axios.post(RPC_API_URL, {
      method: 'gateway_balances',
      params: [{
        account: account,
        ledger_index: ledger || 'validated',
        hotwallet: hotwallets || [],
        strict: true
      }]
    }, {
      // Configuration to handle rippled responses
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const body = response.data;

    if (body.result) {
      console.log('Ledger Hash:', body.result.ledger_hash);
      console.log('');

      if (ledger && ledger !== body.result.ledger_index) {
        console.log('WARNING - Different ledger index:', body.result.ledger_index);
        console.log('');
      }

      if (body.result.assets) {
        console.log('Assets:')
        console.log(pretty(body.result.assets));
      }

      if (body.result.balances) {
        console.log('Hot Wallets Balances:')
        console.log(pretty(body.result.balances));
      }

      if (body.result.obligations) {
        console.log('Obligations:')
        console.log(pretty(body.result.obligations));
      }
    } else {
      console.log('RPC Error Response:', body);
    }
  } catch (err) {
    console.error('Rippled RPC API Error:');
    // Use the response data if available for detailed error
    console.error(err.response ? err.response.data : err.message);
  }
}

/**
 * Fetches the latest or specified ledger index and proceeds to get balances.
 * @param {string} date - Date string for ledger lookup (e.g., '/2023-01-01T00:00:00Z').
 * @param {string} account - The gateway account address.
 * @param {string[]} hotwallets - List of hot wallet addresses.
 */
async function getLedgerAndRun(date, account, hotwallets) {
  try {
    const url = DATA_API_URL + date;
    const response = await axios.get(url);
    const body = response.data;

    if (body.ledger) {
      const ledger = body.ledger.ledger_index;
      console.log('Resolved Ledger:', ledger);
      console.log('Close Time:', body.ledger.close_time_human);
      console.log('---');
      
      await getBalances(account, ledger, hotwallets);

    } else {
      console.log('Data API did not return a ledger:', body);
    }

  } catch (err) {
    console.error('Ripple Data API Error:');
    console.error(err.response ? err.response.data : err.message);
  }
}

/**
 * Main function to parse arguments and execute the workflow.
 */
async function main() {
  // Use minimist for cleaner argument parsing
  const args = minimist(process.argv.slice(2), {
    alias: {
      a: 'account',
      h: 'hotwallets',
      d: 'date',
      l: 'ledger'
    },
    default: {
      date: ''
    }
  });

  const account = args.account;
  let hotwallets = args.hotwallets;
  const ledger = args.ledger;
  let date = args.date; // e.g. "2023-01-01T00:00:00Z"

  if (!account) {
    console.error('Error: account is required.');
    console.log('Usage: node script.js --account <address> [--hotwallets <addr1,addr2,...>] [--ledger <index> | --date <iso-date>]');
    return;
  }
  
  // Format date for API if provided
  if (date) {
    date = '/' + date;
  }
  
  // Split hotwallets string into an array if provided
  if (hotwallets && typeof hotwallets === 'string') {
     hotwallets = hotwallets.split(',');
  } else if (!hotwallets) {
     hotwallets = []; // Ensure it's an array if not provided
  }


  if (ledger) {
    await getBalances(account, ledger, hotwallets);
  } else {
    await getLedgerAndRun(date, account, hotwallets);
  }
}

main();
