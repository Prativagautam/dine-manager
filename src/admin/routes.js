/*CSS*/
import './admin.scss';

/* WordPress */
import { render, createContext, useContext } from '@wordpress/element';

/* Library */
import { map, isEmpty } from 'lodash';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { theme } from '../shared/theme';
/*Atrc*/
import {
    AtrcHashRouter,
    AtrcRoute,
    AtrcRoutes,
    AtrcWrap,
    AtrcNotice,
    AtrcWrapFloating,
    AtrcMain
} from 'atrc';


import { AtrcApplyWithSettings } from 'atrc/build/data';
import { Flex, Box } from '@mantine/core';
import Sidebar from './components/organisms/sidebar';
/*Inbuilt*/
import AdminHeader from './components/organisms/admin-header';
import RequireCapability from './components/organisms/require-capability';
import Initlanding from './pages/landing';
import InitSettings from './pages/settings/routes';
import MenuManagement from './pages/menu';
import TableManagement from './pages/tables';
import Reservations from './pages/reservations';
import Orders from './pages/orders';

/* Local */

/* ==============Create Local Storage and Database Settings Context================== */
export const AtrcReduxContextData = createContext();

const AdminRoutes = () => {
    const data = useContext(AtrcReduxContextData);
    const { dbNotices, dbRemoveNotice } = data;

    return (
        <>
            <Flex>
                <Sidebar />
                <Box style={{ flex: 1, minWidth: 0 }}>
                    <AdminHeader />
                    <AtrcMain>
                        <AtrcRoutes>
                            <AtrcRoute
                                index
                                element={<Initlanding />}
                            />
                            <AtrcRoute
                                exact
                                path='/settings/*'
                                element={<InitSettings />}
                            />
                            <AtrcRoute
                                exact
                                path='/menu'
                                element={
                                    <RequireCapability capability='manage_rms_menu_items'>
                                        <MenuManagement />
                                    </RequireCapability>
                                }
                            />
                            <AtrcRoute
                                exact
                                path='/tables'
                                element={
                                    <RequireCapability capability='manage_rms_tables'>
                                        <TableManagement />
                                    </RequireCapability>
                                }
                            />
                            <AtrcRoute
                                exact
                                path='/reservations'
                                element={
                                    <RequireCapability capability='manage_rms_reservations'>
                                        <Reservations />
                                    </RequireCapability>
                                }
                            />
                            <AtrcRoute
                                exact
                                path='/orders'
                                element={
                                    <RequireCapability capability='manage_rms_orders'>
                                        <Orders />
                                    </RequireCapability>
                                }
                            />
                        </AtrcRoutes>
                        {/*Notice is common for settings*/}
                        {!isEmpty(dbNotices) ? (
                            <AtrcWrapFloating>
                                {map(dbNotices, (value, key) => (
                                    <AtrcNotice
                                        key={key}
                                        autoDismiss={5000}
                                        onAutoRemove={() => dbRemoveNotice(key)}
                                        onRemove={() => dbRemoveNotice(key)}>
                                        {value.message}
                                    </AtrcNotice>
                                ))}
                            </AtrcWrapFloating>
                        ) : null}
                    </AtrcMain>
                </Box>
            </Flex>
        </>
    );
};

/* Init actual WordPress settings */
const InitDatabaseSettings = (props) => {
    const {
        isLoading,
        canSave,
        settings,
        updateSetting,
        saveSettings,
        notices,
        removeNotice,
        lsSettings,
        lsUpdateSetting,
        lsSaveSettings,
    } = props;

    const dbProps = {
        dbIsLoading: isLoading,
        dbCanSave: canSave,
        dbSettings: settings,
        dbUpdateSetting: updateSetting,
        dbSaveSettings: saveSettings,
        dbNotices: notices,
        dbRemoveNotice: removeNotice,
        lsSettings: lsSettings,
        lsUpdateSetting: lsUpdateSetting,
        lsSaveSettings: lsSaveSettings,
    };
    return (
        <AtrcReduxContextData.Provider value={{ ...dbProps }}>
            <AtrcHashRouter basename='/'>
                <AtrcWrap
                    variant='wrp'
                    className='at-box-szg at-m at-typ'>
                    <AdminRoutes />
                </AtrcWrap>
            </AtrcHashRouter>
        </AtrcReduxContextData.Provider>
    );
};
const InitDataBaseSettingsWithHoc = AtrcApplyWithSettings(InitDatabaseSettings);

/* Init local storage settings */
const InitLocalStorageSettings = (props) => {
    const { settings, updateSetting, saveSettings } = props;
    const defaultSettings = {
        gs1: true /* getting started 1 */,
    };
    return (
        <InitDataBaseSettingsWithHoc
            atrcStore={RestaurantManagementSystemLocalize.store}//store from AtrcRegisterStore
            atrcStoreKey='settings'//key from admin.js
            lsSettings={settings || defaultSettings}
            lsUpdateSetting={updateSetting}
            lsSaveSettings={saveSettings}
        />
    );
};
const InitLocalStorageSettingsWithHoc = AtrcApplyWithSettings(
    InitLocalStorageSettings
);

document.addEventListener('DOMContentLoaded', () => {
    const rootElement = document.getElementById(RestaurantManagementSystemLocalize.root_id);

    if (rootElement) {
        render(
            <MantineProvider theme={theme}>
                <InitLocalStorageSettingsWithHoc
                    atrcStore={RestaurantManagementSystemLocalize.store}
                    atrcStoreKey='RestaurantManagementSystemLocal'
                />
            </MantineProvider>,
            rootElement
        );
    }
});