/* eslint
no-console: 0,
no-async-promise-executor: 0
*/

import React from 'react';
import {
  Grid,
  Dropdown,
  Header,
  Message,
  Button,
  Segment
} from 'semantic-ui-react';
import { DataConsumer } from '../../context/data';
import CostTables from './cost-tables';
import AddCost from './add-cost';

const costTables = [
  'Server',
  'Rack Infrastructure',
  'Software',
  'Storage',
  'Network',
  'Facilities',
  'Labor',
  'Miscellaneous'
];

export default class WorkloadCosts extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      cost: null
    };
  }

  render() {
    return (
      <DataConsumer>
        {({ workloadEntities, selectedWorkload, updateDataState }) => {
          const workloadOptions = workloadEntities.map(wl => ({
            key: wl.name,
            text: wl.name.replace(/Datacenter:/g, ''),
            value: wl.name
          }));

          const costOptions = costTables.map(c => ({
            key: c,
            text: c,
            value: c
          }));

          let wl = workloadEntities.filter(d => d.name === selectedWorkload);
          wl = wl[0] || null;

          const dcDoc = (wl || {}).dcDoc || null;
          const costs = (dcDoc || {}).costs || null;
          const costTotal = wl ? wl.costTotal : null;

          return (
            <Grid>
              <Grid.Row style={{ paddingBottom: '0px' }}>
                <Grid.Column style={{ paddingTop: '15px' }}>
                  <Header as="h3">Workload Costs</Header>
                  <Message
                    floating
                    style={{ borderRadius: 0, backgroundColor: 'white' }}
                  >
                    <Message.Header>Input your workload costs.</Message.Header>
                    <Message.List>
                      <Message.Item>
                        The inputted costs will be used to estimate the running
                        cost of each instance for cost analysis.
                      </Message.Item>
                    </Message.List>
                  </Message>

                  <Segment raised color="grey">
                    <div
                      style={{
                        margin: '9px',
                        padding: '10px',
                        paddingTop: '5px'
                      }}
                    >
                      <Header as="h4">Select a workload.</Header>
                      <Dropdown
                        style={{ width: '250px' }}
                        className="singledrop"
                        placeholder="Select Workload"
                        search
                        selection
                        options={workloadOptions}
                        value={selectedWorkload}
                        onChange={(e, d) =>
                          updateDataState({
                            selectedWorkload: d.value
                          })
                        }
                      />
                      &nbsp;
                      <Button
                        icon="external"
                        color="blue"
                        content="View Workload"
                        disabled={!selectedWorkload}
                        onClick={() =>
                          window.open(
                            ` https://one.newrelic.com/redirect/entity/${wl.guid}`,
                            '_blank'
                          )
                        }
                      />
                    </div>
                  </Segment>
                </Grid.Column>
              </Grid.Row>
              <Grid.Row style={{ display: selectedWorkload ? '' : 'none' }}>
                <Grid.Column
                  style={{ display: workloadOptions.length > 0 ? '' : 'none' }}
                >
                  <Segment raised>
                    <div style={{ margin: '9px', padding: '10px' }}>
                      {selectedWorkload && dcDoc ? (
                        <CostTables
                          dc={wl}
                          guid={wl.guid}
                          doc={dcDoc || {}}
                          costTotal={costTotal}
                          costs={costs}
                          selectedWorkload={selectedWorkload}
                        />
                      ) : (
                        <>
                          <Header
                            as="h4"
                            content="Add your first cost."
                            style={{ paddingTop: '5px' }}
                          />
                          <Dropdown
                            style={{ width: '250px' }}
                            className="singledrop"
                            placeholder="Select Cost Category"
                            search
                            selection
                            options={costOptions}
                            value={this.state.cost}
                            onChange={(e, d) =>
                              this.setState({
                                cost: d.value
                              })
                            }
                          />
                          &nbsp;
                          <div
                            style={{
                              display: this.state.cost ? 'inline' : 'none'
                            }}
                          >
                            <AddCost
                              selectedCost={this.state.cost}
                              selectedWorkload={selectedWorkload}
                              button
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </Segment>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          );
        }}
      </DataConsumer>
    );
  }
}
