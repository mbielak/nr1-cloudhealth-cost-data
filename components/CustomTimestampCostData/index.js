import { Component } from 'react';
import { 
    Spinner, 
    NerdGraphQuery, 
    ScatterChart
} from 'nr1';

export default class CostData extends Component {

    constructor(props) {
        super(props)
        this.state = { costData: null }
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
        const { accountId, sinceClause } = this.props;
        const variables = {
            id: accountId
        };

        const nrqlSince = sinceClause;

        let query = `
            query($id: Int!) {
                actor {
                    account(id: $id) {
                        cost: nrql(query: "select sum(ch.aws.cost) as 'cost' FROM Metric ${nrqlSince} facet service.name, original_timestamp limit max") {results}
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
                    
                    return nData;
                })

                let uniques = [...new Set(sNames)];
                var fNameset = [];

                uniques.forEach((item) => {

                    let dataMini = [];

                    formatMeData.forEach((thing) => {
                        if (thing.name === item){
                           dataMini.push({'x': thing.timestamp, 'y': thing.cost});
                        }
                    });

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

                this.setState({costData: fNameset});
            }).catch((error) => { console.debug(error); })
    }

    render() {
        const { costData } = this.state;
        let returnVal = <Spinner />
        if(costData) {
            returnVal=<ScatterChart data={costData} fullWidth fullHeight/>
        }
        return returnVal
    }
}