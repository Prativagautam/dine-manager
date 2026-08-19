import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import './style.scss';

const { name } = metadata as { name: string };

registerBlockType(name, {
	...metadata,
	edit: Edit,
	save: () => null,
});
