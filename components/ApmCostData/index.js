import React from 'react';
import { 
    Spinner, 
    TableChart,
    LineChart, 
    NerdGraphQuery
} from 'nr1';

// https://docs.newrelic.com/docs/new-relic-programmable-platform-introduction

export default class ApmCostData extends React.Component {
    
    constructor(props) {
        super(props)
        this.state = { 
            apmCostData: null,
            sinceTime: null,
            untilTime: null,
            matchingServices: null,
        }
    }

    async componentDidMount() {
        this.loadData();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.sinceClause!==this.props.sinceClause || prevProps.serviceName !== this.props.serviceName) {
            this.setState({apmCostData: null});
            this.loadData();
        }
    }

    loadData() {
        const { accountId, sinceClause, serviceName, apmTagsArr } = this.props;
        const variables = {
            id: accountId
        };

        const nrqlSince = sinceClause;

        var apmNames = [];

        if (apmTagsArr.length > 0) {
            apmTagsArr.forEach((item) => {
                if (item.tags){
                    item.tags.forEach((val) => {
                        if (val.key === 'Service' || val.key === 'service'){
                            apmNames.push({"name": item.name, "tags": val});
                        }
                    })
                }
            })
        }

        var matchingServiceNames = [];

        apmNames.forEach((item) => {
            if (item.tags.values[0] === serviceName) {
                matchingServiceNames.push(`\'${item.name}\'`);
            }
        });

        let query = `
            query($id: Int!) {
                actor {
                    account(id: $id) {
                        cost: nrql(query: "SELECT sum(ch.aws.cost) as 'sum' from Metric where service.name = '${serviceName}' ${sinceClause} facet service.name limit max") {results}
                    }
                }
            }
            `;
             
        if (matchingServiceNames.length > 0) {
            query = `
            query($id: Int!) {
                actor {
                    account(id: $id) {
                        cost: nrql(query: "SELECT sum(ch.aws.cost) as 'sum' from Metric where service.name = '${serviceName}' ${sinceClause} facet service.name limit max") {results}
                        tCount: nrql(query: "select count(*) FROM Transaction where appName in (${matchingServiceNames}) ${nrqlSince} facet appName limit max") {results}
                    }
                }
            }
            `
        };

        var q = NerdGraphQuery.query({ query: query, variables: variables });
        q.then(results => { 

            const dataFormatter = (data, id, name, columns) =>{
               // console.debug("apm cd formatter data: ", data, id, name, columns);

                return {
                    metadata: {
                        columns: columns,
                    },
                    data: data
                }
            };

            var formattedData=[];
            var cTimes = [];

            // TODO -- > find timestamps
            /*var customTimestamps = results.data.actor.account.cost.results.map((item) => {
                if(item.facet[1]){
                    cTimes.push({'timestamp': item.facet[1]})
                }
            })
            */

            var finalData = {
                "serviceName": serviceName,
                "serviceCost": results.data.actor.account.cost.results[0].sum, 
                "appName": 'No tags found for: '+serviceName,
                "transactionCount": 'N/A',
                "costPerTxn": 'N/A'
            };            
            
            if(matchingServiceNames.length > 0) {

                matchingServiceNames.forEach((service, index) => {

                    finalData={
                        "serviceName": serviceName,
                        "serviceCost": results.data.actor.account.cost.results[0].sum, 
                        "appName": service,
                        "transactionCount": results.data.actor.account.tCount.results[index].count,
                        "costPerTxn": Number(results.data.actor.account.cost.results[0].sum)/Number(results.data.actor.account.tCount.results[index].count)
                    };

                    formattedData.push(finalData);
                });

            } else {

                formattedData.push(finalData);
            }
            
            let formattedColumns = ['serviceName', 'serviceCost', 'appName', 'transactionCount', 'costPerTxn'];
            
            var finalDataSet = [];

            finalDataSet.push(dataFormatter(formattedData,'series1','costDataTableSet',formattedColumns));
            this.setState({apmCostData: finalDataSet, matchingServices: matchingServiceNames});

        }).catch((error) => { 
            console.debug(error); 
        });
    };

    render() {
        const { apmCostData } = this.state;
        var returnVal = <Spinner />

        if (apmCostData) {
            returnVal = <TableChart data={apmCostData} fullWidth fullHeight className="chart"/>
        } 

        return <> 
        {returnVal}
        </>
        
    }
}