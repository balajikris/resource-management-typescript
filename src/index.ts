import * as msRest from 'ms-rest';
import * as msRestAzure from 'ms-rest-azure';

import { ResourceManagementClient, ResourceModels } from 'azure-arm-resource';

class State {
    public clientId: string = process.env['CLIENT_ID'];
    public domain: string = process.env['DOMAIN'];
    public secret: string = process.env['APPLICATION_SECRET'];
    public subscriptionId: string = process.env['AZURE_SUBSCRIPTION_ID'];
    public options: string;
}

class StorageSample {
    private resourceGroupName = Helpers.generateRandomId('testrg');
    private resourceName = Helpers.generateRandomId('testresource');

    private resourceProviderNamespace = 'Microsoft.KeyVault';
    private parentResourcePath = '';
    private resourceType = 'vaults';
    private apiVersion = '2015-06-01';

    private location = 'westus';

    private resourceClient: ResourceManagementClient;

    constructor(public state: State) {
    }

    public execute(): void {
        msRestAzure
            .loginWithServicePrincipalSecret(this.state.clientId, this.state.secret, this.state.domain, this.state.options)
            .then((credentials) => {
                this.resourceClient = new ResourceManagementClient(credentials, this.state.subscriptionId);
                this.createResourceGroup()
                    .then((rg) => {
                        console.log(`\n-->result of create resource group operation is ${JSON.stringify(rg)}`)
                        return this.listResourceGroups();
                    })
                    .then((rgs) => {
                        console.log(`\n-->result of list resource groups operation is ${JSON.stringify(rgs)}`)
                        return this.updateResourceGroup();
                    })
                    .then((rg) => {
                        console.log(`\n-->result of update resource group operation is ${JSON.stringify(rg)}`)
                        return this.createResource();
                    })
                    .then((rg) => {
                        console.log(`\n-->result of create resource operation is ${JSON.stringify(rg)}`)
                        return this.getResource();
                    })
                    .then((res) => {
                        console.log(`\n-->result of get resource operation is ${JSON.stringify(res)}`)
                        return this.exportResourceGroupTemplate();
                    })
                    .then((rgExportRes) => {
                        console.log(`\n-->result of export resource group template operation is ${JSON.stringify(rgExportRes)}`)
                        console.log(`\n####Successfully completed all operations on resource management####`);
                    })
            })
            .catch((error) => console.log(`Error occurred: ${error}`));
    }

    private createResourceGroup(): Promise<ResourceModels.ResourceGroup> {
        let groupParameters: ResourceModels.ResourceGroup = {
            location: this.location
        };

        console.log(`\n1. Creating resource group: ${this.resourceGroupName}`);
        return this.resourceClient.resourceGroups.createOrUpdate(this.resourceGroupName, groupParameters);
    }

    private listResourceGroups(): Promise<ResourceModels.ResourceGroupListResult> {
        console.log(`\n2. Listing resource groups: `);
        return this.resourceClient.resourceGroups.list();
    }

    private updateResourceGroup(): Promise<ResourceModels.ResourceGroup> {
        let groupParameters: ResourceModels.ResourceGroup = {
            location: this.location
        };

        console.log(`\n3. Updating resource group: : ${this.resourceGroupName}`);
        return this.resourceClient.resourceGroups.createOrUpdate(this.resourceGroupName, groupParameters);
    }

    private createResource(): Promise<ResourceModels.ResourceGroup> {
        var keyvaultParameter: ResourceModels.GenericResource = {
            location: this.location,
            properties: {
                sku: {
                    family: 'A',
                    name: 'standard'
                },
                accessPolicies: [],
                enabledForDeployment: true,
                enabledForTemplateDeployment: true,
                tenantId: this.state.domain
            },
            tags: {}
        };

        console.log(`\n4. Creating a key vault resource ${this.resourceName} in resource group ${this.resourceGroupName}:`);
        return this.resourceClient.resources.createOrUpdate(
            this.resourceGroupName,
            this.resourceProviderNamespace,
            this.parentResourcePath,
            this.resourceType,
            this.resourceName,
            this.apiVersion,
            keyvaultParameter);
    }

    private getResource(): Promise<ResourceModels.GenericResource> {
        console.log(`\n5.Getting resource ${this.resourceName} details in resource group ${this.resourceGroupName}:`);
        return this.resourceClient.resources.get(
            this.resourceGroupName,
            this.resourceProviderNamespace,
            this.parentResourcePath,
            this.resourceType,
            this.resourceName,
            this.apiVersion);
    }

    private exportResourceGroupTemplate(): Promise<ResourceModels.ResourceGroupExportResult> {
        let rgParams: ResourceModels.ExportTemplateRequest = {
            resourcesProperty: ['*']
        }
        console.log(`\n6. Exporting resource group template: ${this.resourceGroupName}`);
        return this.resourceClient.resourceGroups.exportTemplate(this.resourceGroupName, rgParams);

    }

    private deleteResource(): Promise<void> {
        console.log(`\nDeleting resource ${this.resourceName} in resource group ${this.resourceGroupName}`);
        return this.resourceClient.resources.deleteMethod(
            this.resourceGroupName,
            this.resourceProviderNamespace,
            this.parentResourcePath,
            this.resourceType,
            this.resourceName,
            this.apiVersion);
    }

    private deleteResourceGroup(): Promise<void> {
        console.log(`\nDeleting resource group: ${this.resourceGroupName}`);
        return this.resourceClient.resourceGroups.deleteMethod(this.resourceGroupName);
    }

}

class Helpers {
    static generateRandomId(prefix: string): string {
        return prefix + Math.floor(Math.random() * 10000);
    }

    static validateEnvironmentVariables(): void {
        let envs = [];
        if (!process.env['CLIENT_ID']) envs.push('CLIENT_ID');
        if (!process.env['DOMAIN']) envs.push('DOMAIN');
        if (!process.env['APPLICATION_SECRET']) envs.push('APPLICATION_SECRET');
        if (!process.env['AZURE_SUBSCRIPTION_ID']) envs.push('AZURE_SUBSCRIPTION_ID');
        if (envs.length > 0) {
            throw new Error(`please set/export the following environment variables: ${envs.toString()}`);
        }
    }
}

main();

function main() {
    Helpers.validateEnvironmentVariables();
    let state = new State();
    let driver = new StorageSample(state);
    driver.execute();
}
