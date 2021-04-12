import React from 'react';
import { Icon, Segment } from 'semantic-ui-react';
import { DataConsumer, categoryTypes } from '../../../context/data';
import { adjustCost, formatValue } from '../../../../shared/lib/utils';
import { getIcon } from '../../../strategies/entity-handler';
import CsvDownload from 'react-json-to-csv';
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  navigation
} from 'nr1';

export default class InstanceCandidates extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {};
  }

  onClickTableHeaderCell = (key, event, sortingData) => {
    this.setState({ [key]: sortingData.nextSortingType });
  };

  render() {
    const { group } = this.props;

    return (
      <DataConsumer>
        {({ costPeriod }) => {
          const getData = (type, item, attr) => {
            let data = null;
            switch (type) {
              case 'system': {
                data =
                  item.systemSample ||
                  item.vsphereVmSample ||
                  item.vsphereHostSample;
                break;
              }
              default:
                data = type ? item[type] : item;
            }

            if (data) {
              if (attr) {
                return data[attr] || '-';
              } else {
                return data;
              }
            }

            return null;
          };

          const getOptimizedData = (item, attr) => {
            let v = '-';
            if (item.optimizedData) {
              if (
                item.optimizedData.state &&
                !item.optimizedData.state.includes('optimize')
              ) {
                return item.optimizedData.state;
              }

              if (item.optimizedData.dcResult) {
                v = item.optimizedData.dcResult[attr] || '-';
              }
            }

            if (item.optimizedResult) {
              v = item.optimizedResult[attr] || '-';
            }

            return v;
          };

          const tableHdrCell = (name, type, attr, order) => (
            <TableHeaderCell
              value={({ item }) => getData(type, item, attr)}
              sortable
              sortingType={this.state[attr]}
              sortingOrder={order}
              onClick={(e, d) => this.onClickTableHeaderCell(attr, e, d)}
            >
              {name}
            </TableHeaderCell>
          );

          const renderRowCell = (v, guid, cost) => (
            <TableRowCell
              onClick={
                guid ? () => navigation.openStackedEntity(guid) : undefined
              }
              style={{
                fontSize: '12px',
                cursor: guid ? 'pointer' : '',
                color: guid ? 'rgb(0, 121, 191)' : ''
              }}
            >
              {cost && !isNaN(v)
                ? formatValue(adjustCost(costPeriod, v), 2)
                : v}
            </TableRowCell>
          );

          const entityItems = group.entities.filter(e =>
            categoryTypes.instances.includes(e.type)
          );

          const tableData = entityItems.map(e => {
            const s = getData('system', e);
            const metric = attr => (s && s[attr] ? s[attr].toFixed(2) : '-');
            const instance = attr =>
              e.instanceResult ? e.instanceResult[attr] : '-';

            const cpusPerVm = instance('cpusPerVm');
            const memPerVm = instance('memPerVm');

            return {
              guid: e.guid,
              cloud: e.cloud,
              spot: e.spot,
              name: e.name,
              'max.cpuPercent': metric('max.cpuPercent'),
              'max.memoryPercent': metric('max.memoryPercent'),
              'max.transmitBytesPerSecond': metric(
                'max.transmitBytesPerSecond'
              ),
              'max.receiveBytesPerSecond': metric('max.receiveBytesPerSecond'),
              coreCount: cpusPerVm || e.coreCount,
              memoryGb: memPerVm || (e.memoryGb || 0).toFixed(2),
              instanceType: instance('type'),
              price: e.cloud
                ? instance('onDemandPrice')
                : e.currentSpend || '-',
              suggestedType: getOptimizedData(e, 'type'),
              suggestedPrice: getOptimizedData(e, 'onDemandPrice'),
              potentialSavings: e.potentialSavings || '-',
              potentialSavingsWithSpot: e.potentialSavingsWithSpot || '-'
            };
          });

          return (
            <>
              <div style={{ paddingTop: '15px', paddingBottom: '30px' }}>
                <CsvDownload
                  style={{
                    display: 'inline-block',
                    fontSize: '12px',
                    padding: '6px 24px',
                    cursor: 'pointer',
                    float: 'right'
                  }}
                  data={tableData}
                >
                  Export CSV
                </CsvDownload>
              </div>
              <Segment raised>
                {group.entities.length > 0 ? (
                  <Table items={tableData} aria-label="table">
                    <TableHeader>
                      <TableHeaderCell
                        value={({ item }) => item.cloud}
                        sortable
                        sortingType={this.state.cloud}
                        sortingOrder={0}
                        onClick={(e, d) =>
                          this.onClickTableHeaderCell('cloud', e, d)
                        }
                        style={{ paddingLeft: '10px' }}
                        width="55px"
                      />
                      {tableHdrCell('Spot?', null, 'spot', 2)}
                      <TableHeaderCell
                        value={({ item }) => item.name}
                        sortable
                        sortingType={this.state.name}
                        sortingOrder={1}
                        onClick={(e, d) =>
                          this.onClickTableHeaderCell('name', e, d)
                        }
                        width="250px"
                      >
                        Name
                      </TableHeaderCell>
                      {tableHdrCell(
                        'Max Cpu Percent',
                        null,
                        'max.cpuPercent',
                        2
                      )}
                      {tableHdrCell(
                        'Max Mem Percent',
                        null,
                        'max.memoryPercent',
                        3
                      )}
                      {tableHdrCell(
                        'Max Tx Bytes Per Second',
                        null,
                        'max.transmitBytesPerSecond',
                        4
                      )}
                      {tableHdrCell(
                        'Max Rx Bytes Per Second',
                        null,
                        'max.receiveBytesPerSecond',
                        5
                      )}
                      {tableHdrCell('Num Cpu', null, 'coreCount', 6)}
                      {tableHdrCell('Mem Gb', null, 'memoryGb', 7)}
                      {tableHdrCell('Instance Type', null, 'instanceType', 8)}
                      {tableHdrCell('Price', null, 'onDemandPrice', 9)}
                      {tableHdrCell(
                        'Suggested Instance Type',
                        null,
                        'suggestedType',
                        10
                      )}
                      {tableHdrCell(
                        'Suggested Price Type',
                        null,
                        'suggestedPrice',
                        10
                      )}

                      {tableHdrCell('Savings', null, 'potentialSavings', 12)}
                      {tableHdrCell(
                        'Savings w/Spot',
                        null,
                        'potentialSavingsWithSpot',
                        12
                      )}
                    </TableHeader>

                    {({ item }) => {
                      const icon = getIcon(item);

                      return (
                        <TableRow>
                          {renderRowCell(
                            icon ? (
                              <img
                                src={icon}
                                height="25px"
                                style={{ paddingLeft: '10px' }}
                              />
                            ) : (
                              <>
                                <Icon
                                  name="server"
                                  size="large"
                                  style={{ paddingLeft: '10px' }}
                                />
                              </>
                            )
                          )}
                          {renderRowCell(item.spot)}
                          {renderRowCell(item.name, item.guid)}
                          {renderRowCell(item['max.cpuPercent'])}
                          {renderRowCell(item['max.memoryPercent'])}
                          {renderRowCell(item['max.transmitBytesPerSecond'])}
                          {renderRowCell(item['max.receiveBytesPerSecond'])}
                          {renderRowCell(item.coreCount)}
                          {renderRowCell(item.memoryGb)}
                          {renderRowCell(item.instanceType)}
                          {renderRowCell(item.price, null, true)}
                          {renderRowCell(item.suggestedType, null, true)}
                          {renderRowCell(item.suggestedPrice, null, true)}
                          {renderRowCell(item.potentialSavings, null, true)}
                          {renderRowCell(
                            item.potentialSavingsWithSpot,
                            null,
                            true
                          )}
                        </TableRow>
                      );
                    }}
                  </Table>
                ) : (
                  'No entities, check your tag filters.'
                )}
              </Segment>
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
