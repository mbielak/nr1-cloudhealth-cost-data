import React from 'react';
import { 
    PlatformStateContext, 
    Spinner, 
    NerdGraphQuery,
    Grid,
    GridItem,
    TableChart,
    BillboardChart,
    LineChart,
    ChartGroup,
    Button
} from 'nr1';
import CostData from '../../components/CustomTimestampCostData';
import CostByService from '../../components/CostByServiceData';
import ApmCostData from '../../components/ApmCostData';

// https://docs.newrelic.com/docs/new-relic-programmable-platform-introduction

export default class CloudhealthCostDataNerdlet extends React.Component {

    constructor(props) {
        super(props)
        this.accountId = <AcctId>
        this.state = {
            apmTagsData: null,
            appName: null,
            serviceName: null,
        }
    }

    setApplication(inAppName) {
        this.setState({ appName: inAppName });
    }

    setServiceTag(inServiceTag) {
        this.setState({ serviceName: inServiceTag });
    }

    async componentDidMount() {
        this.loadData();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.sinceClause!==this.props.sinceClause || prevProps.appName!==this.props.appName || prevProps.serviceName !== this.props.serviceName){
            this.loadData();
        }
    }

    loadData() {

        const accountId = this.accountId;
        const variables = {
            id: accountId
        };

        let query = `
            query{
                actor {
                  entitySearch(query: "domain in ('APM')") {
                    results {
                      entities {
                        guid
                        name
                        tags {
                          key
                          values
                        }
                      }
                    }
                  }
                }
              }
            `;

        var q = NerdGraphQuery.query({ query: query, variables: variables });
        q.then(results => {

            const apmTagsCollection = results.data.actor.entitySearch.results.entities.map((item, index) => {
                return {"guid": item.guid, "name": item.name, "tags": item.tags};
            })

            //console.debug("APM entity tags: ", apmTagsCollection);
            this.setState({apmTagsData: apmTagsCollection});
        })

    }

    render() {
        return <PlatformStateContext.Consumer>
            {(platformUrlState) => {

                var sinceClause = "";
                
                if (platformUrlState && platformUrlState.timeRange) {
                    if (platformUrlState.timeRange.duration) {
                        sinceClause = `since ${platformUrlState.timeRange.duration/1000/60} minutes ago`;
                    } else if (platformUrlState.timeRange.begin_time && platformUrlState.timeRange.end_time){
                        sinceClause = `since ${platformUrlState.timeRange.begin_time} until ${platformUrlState.timeRange.end_time}`;
                    }
                }

                const {apmTagsData, appName, serviceName } = this.state;

                let returnVal = <Spinner />

                const nrqlApmSum = `SELECT count(*) as 'transactions', percentile(duration, 99) FROM Transaction ${sinceClause} facet appName limit max`;
                const nrqlCostSum = `SELECT sum(ch.aws.cost) as 'Sum Cost' from Metric facet service.name ${sinceClause} limit max`;
                const nrqlApmTxnCount = `SELECT count(*) FROM Transaction WHERE appName like '%${appName}%' TIMESERIES ${sinceClause} limit max`;
                const nrqlApmAvgDur = `SELECT average(duration), percentile(duration, 99) FROM Transaction WHERE appName like '%${appName}%' TIMESERIES ${sinceClause} limit max`;
                const nrqlCostTotal = `SELECT sum(ch.aws.cost) as 'Total' FROM Metric WHERE service.name = '${serviceName}' ${sinceClause}`;

                return <>
                    <Grid>
                        <ChartGroup>
        
                        <GridItem columnSpan={4} className="ChartRow">
                            <h3>Total Cost by Service Name</h3>
                            <TableChart query={nrqlCostSum} accountId={this.accountId} className="top-chart" fullWidth fullHeight onClickTable={(dataEl, row, chart) => {
                                    this.setServiceTag(row['service.name']);
                            }}/>
                        </GridItem>

                        <GridItem columnSpan={4} className="ChartRow">
                            <h3>APM Services Summary</h3>
                            <TableChart query={nrqlApmSum} accountId={this.accountId} className="top-chart" fullWidth fullHeight onClickTable={(dataEl, row, chart) => {
                                    this.setApplication(row.appName);
                            }}/>
                        </GridItem>

                        <GridItem columnSpan={4} className="ChartRow">
                            <h3>Current Cost Data Over Time</h3>
                            <CostData accountId={this.accountId} sinceClause={sinceClause} fullWidth fullHeight className="top-chart"/>
                        </GridItem>

                        {serviceName && 
                        <>
                            <GridItem columnSpan={2} className="ChartRow">
                                <h4>Total Cost for <b>{serviceName}</b></h4>
                                <BillboardChart accountId={this.accountId} query={nrqlCostTotal} fullWidth fullHeight className="top-chart"/>
                            </GridItem>
                        
                            <GridItem columnSpan={4} className="ChartRow">
                                <h4>Cost Over Time for <b>{serviceName}</b></h4>
                                <CostByService accountId={this.accountId} sinceClause={sinceClause} serviceName={serviceName} className="top-chart"/>
                            </GridItem>

                            <GridItem columnSpan={6} className="ChartRow">
                                <h4>Cost Per Transaction Breakdown for <b>{serviceName}</b></h4>
                                <ApmCostData accountId={this.accountId} sinceClause={sinceClause} serviceName={serviceName} apmTagsArr={apmTagsData} className="top-chart"/>
                            </GridItem>
                        </>
                        }
                        
                        {appName && 
                        <>
                            <GridItem columnSpan={6} className="ChartRow">
                                <h4>Count of Transactions for <b>{appName}</b></h4>
                                <LineChart accountId={this.accountId} query={nrqlApmTxnCount} fullWidth style={{height: '90%'}} className="top-chart"/>
                            </GridItem>
                        
                            <GridItem columnSpan={6} className="ChartRow">
                                <h4>Duration Breakdown for <b>{appName}</b></h4>
                                <LineChart accountId={this.accountId} query={nrqlApmAvgDur} fullWidth style={{height: '90%'}} className="top-chart"/>
                            </GridItem>
                        </>
                        }

                       </ChartGroup>
                    </Grid>

                    <Button
                        onClick={() => {
                            this.setState({appName: null,
                                serviceName: null,
                            })
                        }}
                        style={{padding: '5px', margin: '4px'}}
                    >
                        Click to Reset!
                    </Button>
                </>

            }}
        </PlatformStateContext.Consumer>
    }
}
