/* *********===================== Setup store ======================********* */
import { AtrcApis, AtrcStore, AtrcRegisterStore } from 'atrc/build/data';

AtrcApis.baseUrl({
    //don't change atrc-global-api-base-url
    key: 'atrc-global-api-base-url',
    // eslint-disable-next-line no-undef
    url: RestaurantManagementSystemLocalize.rest_url,
});

/* Settings */
AtrcApis.register({
    key: 'settings',
    path: 'restaurant-management-system/v1/settings',
    type: 'settings',
});

/* Settings Local for user preferance work with Window: localStorage property */
AtrcStore.register({
    key: 'RestaurantManagementSystemLocal',
    type: 'localStorage',
});

// eslint-disable-next-line no-undef
AtrcApis.xWpNonce(RestaurantManagementSystemLocalize.nonce);
AtrcRegisterStore(RestaurantManagementSystemLocalize.store);

import './routes';

