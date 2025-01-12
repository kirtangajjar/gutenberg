/**
 * External dependencies
 */
import { debounce } from 'lodash';

/**
 * WordPress dependencies
 */
import {
	PanelBody,
	TextControl,
	SelectControl,
	RangeControl,
	ToggleControl,
	Notice,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { useEffect, useState, useCallback } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';

/**
 * Internal dependencies
 */
import OrderControl from './order-control';
import AuthorControl from './author-control';
import ParentControl from './parent-control';
import TaxonomyControls from './taxonomy-controls';
import { usePostTypes } from '../../utils';

function useIsPostTypeHierarchical( postType ) {
	return useSelect(
		( select ) => {
			const type = select( coreStore ).getPostType( postType );
			return type?.viewable && type?.hierarchical;
		},
		[ postType ]
	);
}

const stickyOptions = [
	{ label: __( 'Include' ), value: '' },
	{ label: __( 'Exclude' ), value: 'exclude' },
	{ label: __( 'Only' ), value: 'only' },
];

export default function QueryInspectorControls( {
	attributes: { query, displayLayout },
	setQuery,
	setDisplayLayout,
} ) {
	const {
		order,
		orderBy,
		author: authorIds,
		postType,
		sticky,
		inherit,
		taxQuery,
		parents,
	} = query;
	const [ showSticky, setShowSticky ] = useState( postType === 'post' );
	const { postTypesTaxonomiesMap, postTypesSelectOptions } = usePostTypes();
	const isPostTypeHierarchical = useIsPostTypeHierarchical( postType );
	useEffect( () => {
		setShowSticky( postType === 'post' );
	}, [ postType ] );
	const onPostTypeChange = ( newValue ) => {
		const updateQuery = { postType: newValue };
		// We need to dynamically update the `taxQuery` property,
		// by removing any not supported taxonomy from the query.
		const supportedTaxonomies = postTypesTaxonomiesMap[ newValue ];
		const updatedTaxQuery = Object.entries( taxQuery || {} ).reduce(
			( accumulator, [ taxonomySlug, terms ] ) => {
				if ( supportedTaxonomies.includes( taxonomySlug ) ) {
					accumulator[ taxonomySlug ] = terms;
				}
				return accumulator;
			},
			{}
		);
		updateQuery.taxQuery = !! Object.keys( updatedTaxQuery ).length
			? updatedTaxQuery
			: undefined;

		if ( newValue !== 'post' ) {
			updateQuery.sticky = '';
		}
		// We need to reset `parents` because they are tied to each post type.
		updateQuery.parents = [];
		setQuery( updateQuery );
	};
	const [ querySearch, setQuerySearch ] = useState( query.search );
	const onChangeDebounced = useCallback(
		debounce( () => {
			if ( query.search !== querySearch ) {
				setQuery( { search: querySearch } );
			}
		}, 250 ),
		[ querySearch, query.search ]
	);
	useEffect( () => {
		onChangeDebounced();
		return onChangeDebounced.cancel;
	}, [ querySearch, onChangeDebounced ] );
	return (
		<InspectorControls>
			<PanelBody title={ __( 'Settings' ) }>
				<ToggleControl
					label={ __( 'Inherit query from template' ) }
					help={ __(
						'Toggle to use the global query context that is set with the current template, such as an archive or search. Disable to customize the settings independently.'
					) }
					checked={ !! inherit }
					onChange={ ( value ) => setQuery( { inherit: !! value } ) }
				/>
				{ ! inherit && (
					<SelectControl
						options={ postTypesSelectOptions }
						value={ postType }
						label={ __( 'Post type' ) }
						onChange={ onPostTypeChange }
						help={ __(
							'WordPress contains different types of content and they are divided into collections called "Post types". By default there are a few different ones such as blog posts and pages, but plugins could add more.'
						) }
					/>
				) }
				{ displayLayout?.type === 'flex' && (
					<>
						<RangeControl
							label={ __( 'Columns' ) }
							value={ displayLayout.columns }
							onChange={ ( value ) =>
								setDisplayLayout( { columns: value } )
							}
							min={ 2 }
							max={ Math.max( 6, displayLayout.columns ) }
						/>
						{ displayLayout.columns > 6 && (
							<Notice status="warning" isDismissible={ false }>
								{ __(
									'This column count exceeds the recommended amount and may cause visual breakage.'
								) }
							</Notice>
						) }
					</>
				) }
				{ ! inherit && (
					<OrderControl
						{ ...{ order, orderBy } }
						onChange={ setQuery }
					/>
				) }
				{ showSticky && (
					<SelectControl
						label={ __( 'Sticky posts' ) }
						options={ stickyOptions }
						value={ sticky }
						onChange={ ( value ) => setQuery( { sticky: value } ) }
						help={ __(
							'Blog posts can be "stickied", a feature that places them at the top of the front page of posts, keeping it there until new sticky posts are published.'
						) }
					/>
				) }
			</PanelBody>
			{ ! inherit && (
				<PanelBody title={ __( 'Filters' ) }>
					<TaxonomyControls onChange={ setQuery } query={ query } />
					<AuthorControl value={ authorIds } onChange={ setQuery } />
					<TextControl
						label={ __( 'Keyword' ) }
						value={ querySearch }
						onChange={ setQuerySearch }
					/>
					{ isPostTypeHierarchical && (
						<ParentControl
							parents={ parents }
							postType={ postType }
							onChange={ setQuery }
						/>
					) }
				</PanelBody>
			) }
		</InspectorControls>
	);
}
