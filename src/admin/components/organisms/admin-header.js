/* WordPress */
import { __ } from '@wordpress/i18n';

import { useContext } from '@wordpress/element';

/* Library */
import classNames from 'classnames';

/*Atrc*/
import { AtrcButton, AtrcWrap, AtrcHeaderTemplate1 } from 'atrc';

/* Inbuilt */
import { AtrcReduxContextData } from '../../routes';

/*Local*/
const AdminHeader = () => {
    const data = useContext(AtrcReduxContextData);

    const { lsSettings, lsSaveSettings } = data;

    /*
     * primaryNav removed — navigation now lives entirely in <Sidebar>
     * (src/admin/components/organisms/sidebar.js), matching DESIGN.md's
     * documented pattern (persistent left sidebar owns wayfinding, top
     * bar is search/notifications/user info only, no nav tabs). This
     * header previously duplicated navigation with its own top tabs
     * ("Getting started" / "Settings") — that was boilerplate scaffold,
     * not an intentional dual-nav design.
     */

    return (
        <AtrcHeaderTemplate1
            isSticky
            logo={{
                src: RestaurantManagementSystemLocalize.white_label.dashboard.logo,
            }}
            floatingSidebar={() => (
                <AtrcWrap className={classNames()}>
                    <AtrcButton
                        className={classNames()}
                        onClick={() => lsSaveSettings(null)}>
                        {__(
                            'Show all hidden informations, notices and documentations ',
                            'restaurant-management-system'
                        )}
                    </AtrcButton>
                </AtrcWrap>
            )}
        />
    );
};

export default AdminHeader;