import React, { useState, useContext } from 'react';
import {
  Toast,
  TextField,
  Table,
  TableRow,
  TableRowCell,
  TableHeader,
  TableHeaderCell,
  navigation,
  AccountStorageQuery,
  AccountStorageMutation,
  Spinner
} from 'nr1';
import DataContext from '../../context/data';

// eslint-disable-next-line no-unused-vars
export default function CollectionList(props) {
  const dataContext = useContext(DataContext);
  const {
    fetchWorkloadCollections,
    selectedAccount,
    accountCollection,
    updateDataState,
    apiUrl,
    optimizerKey,
    uuid,
    timeRange,
    email
  } = dataContext;

  // const [name, setName] = useState("");
  const [searchText, setSearch] = useState('');
  const [column, setColumn] = useState(0);
  const [sortingType, setSortingType] = useState(
    TableHeaderCell.SORTING_TYPE.NONE
  );

  const deleteWorkloadCollection = documentId => {
    return new Promise(resolve => {
      AccountStorageMutation.mutate({
        accountId: selectedAccount.id,
        actionType: AccountStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
        collection: 'workloadCollections',
        documentId
      }).then(async result => {
        fetchWorkloadCollections();
        resolve(result);
      });
    });
  };

  const onClickTableHeaderCell = (nextColumn, { nextSortingType }) => {
    if (nextColumn === column) {
      setSortingType(nextSortingType);
    } else {
      setSortingType(nextSortingType);
      setColumn(nextColumn);
    }
  };

  const filteredAccountCollection = accountCollection.filter(a =>
    a.document.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const getLatestConfiguration = documentId => {
    return new Promise(resolve => {
      AccountStorageQuery.query({
        accountId: selectedAccount.id,
        collection: 'workloadCollections',
        documentId
      }).then(value => resolve(value?.data?.config || {}));
    });
  };

  const actions = hasResults => {
    const allActions = [
      {
        label: 'Run (Analyze past 7 days)',
        onClick: async (evt, { item }) => {
          Toast.showToast({
            title: 'Requesting job',
            type: Toast.TYPE.NORMAL
          });
          const config = await getLatestConfiguration(item.id);
          postData(`${apiUrl}/optimize`, optimizerKey.key, {
            workloadGuids: item.document.workloads.map(w => w.guid),
            accountId: selectedAccount.id,
            nerdpackUUID: uuid,
            collectionId: item.id,
            config
          }).then(data => {
            if (data?.success) {
              Toast.showToast({
                title: 'Job sent successfully',
                description: 'Processing...',
                type: Toast.TYPE.NORMAL
              });
            }
          });
        }
      },
      {
        label: 'Run with time range',
        onClick: async (evt, { item }) => {
          Toast.showToast({
            title: 'Requesting job',
            type: Toast.TYPE.NORMAL
          });
          const config = await getLatestConfiguration(item.id);
          postData(`${apiUrl}/optimize`, optimizerKey.key, {
            workloadGuids: item.document.workloads.map(w => w.guid),
            accountId: selectedAccount.id,
            nerdpackUUID: uuid,
            collectionId: item.id,
            timeRange,
            config
          }).then(data => {
            if (data?.success) {
              Toast.showToast({
                title: 'Job sent successfully',
                description: 'Processing... can take up to 15m',
                type: Toast.TYPE.NORMAL
              });
            }
          });
        }
      },
      {
        label: 'Update Workloads',
        onClick: (evt, { item }) => {
          updateDataState({
            editCollectionOpen: true,
            editCollectionId: item.id
          });
        }
      },
      {
        label: 'Edit Optimization Config',
        onClick: (evt, { item }) => {
          const nerdlet = {
            id: 'optimization-configuration-nerdlet',
            urlState: {
              wlCollectionId: item.id,
              document: item.document,
              account: selectedAccount,
              email
            }
          };

          navigation.openStackedNerdlet(nerdlet);
        }
      },
      {
        label: 'Edit Suggestions Config',
        onClick: (evt, { item }) => {
          const nerdlet = {
            id: 'suggestions-configuration-nerdlet',
            urlState: {
              wlCollectionId: item.id,
              document: item.document,
              account: selectedAccount,
              email
            }
          };

          navigation.openStackedNerdlet(nerdlet);
        }
      }
    ];

    if (hasResults)
      allActions.push({
        label: 'Results',
        onClick: (evt, { item }) => {
          const nerdlet = {
            id: 'results-nerdlet',
            urlState: {
              wlCollectionId: item.id,
              ...item.document,
              account: selectedAccount
            }
          };

          navigation.openStackedNerdlet(nerdlet);
        }
      });

    allActions.push({
      label: 'Delete',
      type: TableRow.ACTION_TYPE.DESTRUCTIVE,
      onClick: (evt, { item }) => {
        deleteWorkloadCollection(item.id);
      }
    });

    return allActions;
  };

  const headers = [
    { value: ({ item }) => item.document.name, width: '40%', key: 'Name' },
    {
      value: ({ item }) => item.document.workloads.length,
      width: '10%',
      key: 'Workloads'
    },
    {
      value: ({ item }) => item.document.createdBy,
      width: '25%',
      key: 'Created By'
    },
    {
      value: ({ item }) => item?.history?.[0]?.document?.startedAt,
      width: '25%',
      key: 'Last Optimized At'
    }
  ];

  return (
    <>
      <TextField
        type={TextField.TYPE.SEARCH}
        placeholder="Search..."
        style={{ width: '100%', paddingBottom: '5px' }}
        onChange={e => setSearch(e.target.value)}
      />

      <Table ariaLabel="" items={filteredAccountCollection} multivalue>
        <TableHeader>
          {headers.map((h, i) => (
            // eslint-disable-next-line react/jsx-key
            <TableHeaderCell
              {...h}
              sortable
              sortingType={
                column === i ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
              }
              onClick={(event, data) => onClickTableHeaderCell(i, data)}
            >
              {h.key}
            </TableHeaderCell>
          ))}
        </TableHeader>

        {({ item }) => {
          const { id, document, history } = item;

          const isRunning = false;

          const startedAt = history?.[0]
            ? new Date(history?.[0]?.document?.startedAt).toLocaleString()
            : undefined;

          const hasResults = (history || []).length > 0;

          return (
            <TableRow actions={actions(hasResults)}>
              <TableRowCell additionalValue={id}>{document.name}</TableRowCell>

              <TableRowCell>{document.workloads.length}</TableRowCell>

              <TableRowCell
                additionalValue={`Last edit by: ${document.lastEditedBy}`}
              >
                {document.createdBy}
              </TableRowCell>

              <TableRowCell>{startedAt}</TableRowCell>

              {isRunning ? (
                <TableRowCell style={{ textAlign: 'right' }}>
                  <Spinner inline type={Spinner.TYPE.DOT} />
                </TableRowCell>
              ) : (
                <TableRowCell
                  style={{ textAlign: 'right' }}
                  additionalValue="additionalFailValue"
                >
                  lastResultText
                </TableRowCell>
              )}
            </TableRow>
          );
        }}
      </Table>
    </>
  );
}

function postData(url = '', key, data = {}) {
  return new Promise(resolve => {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'NR-API-KEY': key,
        'NR-REGION': (window?.location?.host || '').includes('one.eu.')
          ? 'EU'
          : undefined
      },
      body: JSON.stringify(data)
    })
      .then(async response => {
        const responseData = await response.json();
        resolve(responseData);
      })
      .catch(err => {
        // eslint-disable-next-line no-console
        console.error(err.text);
        resolve();
      });
  });
}
