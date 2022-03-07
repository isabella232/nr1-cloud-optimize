/* eslint
no-console: 0,
no-async-promise-executor: 0,
no-func-assign: 0,
require-atomic-updates: 0,
no-unused-vars: 0
*/

import React, { Component } from 'react';
import {
  AccountStorageQuery,
  nerdlet,
  Icon,
  NerdGraphQuery,
  NerdGraphMutation,
  EntityStorageMutation
} from 'nr1';
import {
  initQuery,
  workloadDiscoveryQuery,
  userApiKeysQuery,
  userApiCreateQuery
} from './queries';
import queue from 'async/queue';

const QUEUE_LIMIT = 5;
const STATUS_COLLECTION = 'jobStatus';

const DataContext = React.createContext();

export class DataProvider extends Component {
  constructor(props) {
    super(props);

    this.state = {
      api: 'https://8qb8qau9g0.execute-api.us-east-1.amazonaws.com/dev/',
      initializing: true,
      accountId: null,
      accountSelectError: null,
      selectedAccount: { id: null, name: null },
      accounts: [],
      fetchingAccountCollection: false,
      accountCollection: null,
      createCollectionOpen: false,
      editCollectionOpen: false,
      editCollectionId: null,
      email: null,
      userId: null,
      workloads: [],
      fetchingAccessibleWorkloads: false,
      fetchingUserApiKeys: false,
      userApiKeys: [],
      optimizerKey: null,
      fetchingJobStatus: false,
      jobStatus: []
    };
  }

  componentDidMount() {
    this.pollJobStatus = setInterval(() => {
      this.fetchJobStatus();
    }, 5000);
  }

  async componentDidUpdate() {
    this.handleUpdate(this.props);
  }

  componentDidCatch(err, errInfo) {
    this.setState({ hasError: true, err, errInfo });
  }

  componentWillUnmount() {
    clearInterval(this.pollJobStatus);
  }

  handleUpdate = props => {
    if (props.accountId !== this.state.accountId) {
      this.accountChange(props.accountId);
    }
  };

  // Fetch account data with additional information (reportingEventTypes)
  initalizeApp = accountId => {
    const { userApiKeys, optimizerKey } = this.state;
    return new Promise(resolve => {
      // https://developer.newrelic.com/components/nerd-graph-query
      NerdGraphQuery.query({
        query: initQuery
      }).then(nerdGraphData => {
        const result = nerdGraphData?.data;
        const actor = result?.actor || {};
        const accounts = actor?.accounts || [];
        const email = actor?.user?.email || '';
        const userId = actor?.user?.id || '';

        this.fetchUserApiKeys(userId, accountId);
        this.fetchJobStatus(accountId);

        resolve({ accounts, email, userId });
      });
    });
  };

  accountChange = accountId => {
    this.setState({ accountId }, async () => {
      let { accounts, email, userId } = this.state;

      if (accounts.length === 0) {
        const initData = await this.initalizeApp(accountId);
        accounts = initData.accounts;
        email = initData.email;
        userId = initData.userId;
      }

      const foundAccount = accounts.find(a => a.id === accountId);

      this.setState(
        {
          fetchingAccountCollection: true,
          email,
          userId,
          selectedAccount: foundAccount || { id: accountId, name: null }
        },
        () => {
          AccountStorageQuery.query({
            accountId,
            collection: 'workloadCollections'
          }).then(({ data }) => {
            this.setState(
              {
                fetchingAccountCollection: false,
                accountCollection: data,
                accountSelectError: foundAccount
                  ? null
                  : 'You are either not authorized to query this account or this account is not subscribed to use this application.'
              },
              () =>
                nerdlet.setConfig({
                  actionControls: true,
                  actionControlButtons: [
                    {
                      label: 'Create Collection',
                      type: 'secondary',
                      iconType: Icon.TYPE.INTERFACE__SIGN__PLUS,
                      onClick: () =>
                        this.updateDataState({ createCollectionOpen: true })
                    }
                  ]
                })
            );
          });
        }
      );
    });
  };

  fetchUserApiKeys = (incomingUserId, incomingAccountId) => {
    const { userId, accountId } = this.state;
    const uid = incomingUserId || userId;
    const aid = incomingAccountId || accountId;

    this.setState({ fetchingUserApiKeys: true }, async () => {
      let userApiKeys = [];

      const apiQueue = queue((task, callback) => {
        const { query } = task;

        NerdGraphQuery.query({
          query
        }).then(response => {
          const apiKeyData = response?.data?.actor?.apiAccess?.keySearch || {};
          const userKeys = apiKeyData?.keys || [];
          const cursor = apiKeyData?.nextCursor;

          userApiKeys = [...userApiKeys, ...userKeys];
          if (cursor) {
            apiQueue.push(userApiKeysQuery(uid, aid, cursor));
          }

          callback();
        });
      }, QUEUE_LIMIT);

      apiQueue.push({ query: userApiKeysQuery(uid, aid) });

      await apiQueue.drain();

      const optimizerKey = userApiKeys.find(
        k => k.name === 'NR1-OPTIMIZER-KEY'
      );

      this.setState(
        { userApiKeys, fetchingUserApiKeys: false, optimizerKey },
        () => {
          if (!optimizerKey) {
            this.createOptimizerUserApiKey(uid, aid);
          }
        }
      );
    });
  };

  createOptimizerUserApiKey = (userId, accountId) => {
    NerdGraphMutation.mutate({
      mutation: userApiCreateQuery(userId, accountId)
    }).then(nerdGraphData => {
      const createdKeys =
        nerdGraphData?.data?.apiAccessCreateKeys?.createdKeys || [];

      if (createdKeys.length === 1) {
        this.setState({ optimizerKey: createdKeys[0].key });
      } else {
        console.log(
          'unable to automatically create user api key',
          nerdGraphData
        );
      }
    });
  };

  fetchWorkloadCollections = () => {
    const { selectedAccount } = this.state;
    this.setState({ fetchingAccountCollection: true }, () => {
      AccountStorageQuery.query({
        accountId: selectedAccount.id,
        collection: 'workloadCollections'
      }).then(({ data }) => {
        this.setState({
          fetchingAccountCollection: false,
          accountCollection: data
        });
      });
    });
  };

  fetchJobStatus = accountId => {
    const { selectedAccount } = this.state;
    const id = accountId || selectedAccount?.id;
    if (id) {
      this.setState({ fetchingJobStatus: true }, () => {
        AccountStorageQuery.query({
          accountId: id,
          collection: STATUS_COLLECTION
        }).then(({ data }) => {
          console.log(data);
          this.setState({
            fetchingJobStatus: false,
            jobStatus: data
          });
        });
      });
    }
  };

  // fetch workloads at the provider level
  // this allows us to avoid refreshing if the modal is open and closed multiple times and we can track if a fetch is in progress
  fetchAccessibleWorkloads = () => {
    const { fetchingAccessibleWorkloads } = this.state;

    if (!fetchingAccessibleWorkloads) {
      this.setState({ fetchingAccessibleWorkloads: true }, async () => {
        let workloads = [];

        const workloadQueue = queue((task, callback) => {
          const { query } = task;

          NerdGraphQuery.query({
            query
          }).then(response => {
            const workloadsData =
              response?.data?.actor?.entitySearch?.results || {};
            const workloadEntities = workloadsData?.entities || [];
            const cursor = workloadsData?.nextCursor;

            workloads = [...workloads, ...workloadEntities];
            if (cursor) {
              workloadQueue.push(workloadDiscoveryQuery(cursor));
            }

            callback();
          });
        }, QUEUE_LIMIT);

        workloadQueue.push({ query: workloadDiscoveryQuery() });

        await workloadQueue.drain();

        this.setState({ workloads, fetchingAccessibleWorkloads: false });
      });
    } else {
      console.log('fetching accessible workloads already in progress');
    }
  };

  updateDataState = (stateData, actions) =>
    new Promise(resolve => {
      if (
        stateData.createCollectionOpen === true ||
        stateData.editCollectionOpen === true
      ) {
        this.fetchAccessibleWorkloads();
      }

      this.setState(stateData, () => {
        resolve();
      });
    });

  render() {
    const { children } = this.props;

    return (
      <DataContext.Provider
        value={{
          ...this.state,
          updateDataState: this.updateDataState,
          fetchAccessibleWorkloads: this.fetchAccessibleWorkloads,
          fetchWorkloadCollections: this.fetchWorkloadCollections,
          fetchJobStatus: this.fetchJobStatus
        }}
      >
        {children}
      </DataContext.Provider>
    );
  }
}

export default DataContext;
export const DataConsumer = DataContext.Consumer;
