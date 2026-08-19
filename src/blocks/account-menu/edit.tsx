import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { useRef, useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import './editor.scss';

interface EditProps {
	attributes: {
		isLoggedIn: boolean;
		iconStyle: 'outline' | 'filled';
	};
	setAttributes: (attrs: { isLoggedIn?: boolean; iconStyle?: 'outline' | 'filled' }) => void;
}

const UserIconOutline = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
		<circle cx="12" cy="7" r="4" />
	</svg>
);

const UserIconFilled = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="currentColor"
		stroke="none"
	>
		<path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
	</svg>
);

const Edit = ({ attributes, setAttributes }: EditProps) => {
	const { isLoggedIn, iconStyle } = attributes;
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

	const close = useCallback(() => {
		setIsOpen(false);
	}, []);

	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				close();
			}
		};

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				close();
				buttonRef.current?.focus();
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [isOpen, close]);

	const blockProps = useBlockProps({
		className: `rms-account-menu rms-account-menu--${iconStyle}`,
	});

	const guestLinks = [
		{ label: __('Sign In', 'restaurant-management-system'), href: '#' },
		{ label: __('Register', 'restaurant-management-system'), href: '#' },
	];

	const userLinks = [
		{ label: __('My Account', 'restaurant-management-system'), href: '#' },
		{ label: __('My Orders', 'restaurant-management-system'), href: '#' },
		{ label: __('My Reservations', 'restaurant-management-system'), href: '#' },
		{ label: __('Logout', 'restaurant-management-system'), href: '#' },
	];

	const links = isLoggedIn ? userLinks : guestLinks;
	const IconComponent = iconStyle === 'filled' ? UserIconFilled : UserIconOutline;

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Account Menu Settings', 'restaurant-management-system')}>
					<ToggleControl
						label={__('Logged In', 'restaurant-management-system')}
						help={
							isLoggedIn
								? __('Previewing logged-in state.', 'restaurant-management-system')
								: __('Previewing logged-out state.', 'restaurant-management-system')
						}
						checked={isLoggedIn}
						onChange={(value) => setAttributes({ isLoggedIn: value })}
					/>
					<SelectControl
						label={__('Icon Style', 'restaurant-management-system')}
						value={iconStyle}
						options={[
							{ label: __('Outline', 'restaurant-management-system'), value: 'outline' },
							{ label: __('Filled', 'restaurant-management-system'), value: 'filled' },
						]}
						onChange={(value) => setAttributes({ iconStyle: value as 'outline' | 'filled' })}
					/>
				</PanelBody>
			</InspectorControls>

			<div {...blockProps}>
				<div className="rms-account-menu__wrapper" ref={containerRef}>
					<button
						ref={buttonRef}
						className="rms-account-menu__toggle"
						onClick={() => setIsOpen(!isOpen)}
						aria-expanded={isOpen}
						aria-label={__('Account menu', 'restaurant-management-system')}
						type="button"
					>
						<IconComponent />
					</button>

					{isOpen && (
						<div className="rms-account-menu__dropdown" role="menu">
							{links.map((link) => (
								<a
									key={link.label}
									className="rms-account-menu__link"
									href={link.href}
									role="menuitem"
									tabIndex={0}
									onClick={(e) => e.preventDefault()}
								>
									{link.label}
								</a>
							))}
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default Edit;
