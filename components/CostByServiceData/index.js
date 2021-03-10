import React from 'react';
import { 
    Spinner, 
    ScatterChart,
    AreaChart,
    LineChart, 
    NerdGraphQuery,
    SparklineChart
} from 'nr1';

// https://docs.newrelic.com/docs/new-relic-programmable-platform-introduction

export default class CostByService extends React.Component {
    
    constructor(props) {
        super(props)
        this.state = { cData: null }
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
        const { accountId, sinceClause, serviceName } = this.props;
        const variables = {
            id: accountId
        };

        const nrqlSince = sinceClause;

        let query = `
            query($id: Int!) {
                actor {
                    account(id: $id) {
                        cost: nrql(query: "select sum(ch.aws.cost) as 'cost' FROM Metric ${nrqlSince} where service.name = '${serviceName}' facet service.name, original_timestamp limit max") {results}
                    }
                    }
                }
            `;

            var sNames = [];

            var q = NerdGraphQuery.query({ query: query, variables: variables });
            q.then(results => { 

                var formatMeData = results.data.actor.account.cost.results.map((item, index) => {
                
                    sNames.push(item.facet[0]);

                    let nData = {'name': item.facet[0], 'timestamp': Number(item.facet[1]), 'cost': Number(item.cost)};
                    
                    return nData
                })

                let uniques = [...new Set(sNames)];
                var fNameset = [];

                uniques.forEach((item) => {

                    let dataMini = [];

                    formatMeData.forEach((thing) => {
                        if (thing.name === item){
                           dataMini.push({'x': thing.timestamp, 'y': thing.cost});
                        }
                    })

                    let serivceCostData =  {
                        metadata: {
                            id: item,
                            name: item,
                            viz: 'main',
                            color: '#'+Math.floor(Math.random()*16777215).toString(16),
                            units_data: {
                                x: 'TIMESTAMP',
                            }
                        },
                        data: dataMini,
                    }; 
                    fNameset.push(serivceCostData);

                });

                this.setState({cData: fNameset});
            }).catch((error) => { console.debug(error); })
    }

    render() {
        const { cData } = this.state;
        let returnVal = <Spinner />
        if(cData) {
            returnVal=<ScatterChart data={cData} fullWidth style={{height: '90%'}}/>
        }
        return returnVal
    }
}