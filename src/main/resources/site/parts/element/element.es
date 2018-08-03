import R from 'render-js/src/class.es';
//camelize
import merge from 'deepmerge';


import {toStr} from '/lib/enonic/util';
import {forceArray} from '/lib/enonic/util/data';
import {get as getContentByKey} from '/lib/xp/content';
import {
    getComponent,
    getContent as getCurrentContent
} from '/lib/xp/portal';


function nameValueItemSetToObject(itemset, o = {}) {
    if (!itemset) { return {}; }
    forceArray(itemset).forEach((item) => {
        o[item.name] = item.value; // eslint-disable-line no-param-reassign
    });
    return o;
}


function styleOptionSetToObject(optionset) {
    if (!optionset) { return {}; }
    let o = {};
    forceArray(optionset).forEach((occurrence) => {
        const propertyObj = nameValueItemSetToObject(occurrence[occurrence._selected].properties);
        o = merge(
            o,
            occurrence._selected === 'nested'
                ? {
                    [`&${occurrence[occurrence._selected].selector}`]: propertyObj
                }
                : propertyObj
        );
    });
    return o;
}


function breakpointsItemSetToObject(itemset) {
    if (!itemset) { return {}; }
    const o = {};
    forceArray(itemset).forEach((breakpoint) => {
        o[`minWidth${breakpoint.minWidth}`] = styleOptionSetToObject(breakpoint.style);
    });
    return o;
}


function styleObjectFromData(data) {
    if (!data.elementId) {
        return styleOptionSetToObject(data.style);
    }
    return merge(
        ...forceArray(data.elementId)
            .map(key => styleObjectFromData(getContentByKey({key}).data)), // NOTE recursive
        styleOptionSetToObject(data.style)
    );
}


export function get() {
    const {config} = getComponent(); //log.info(toStr({config}));
    const elementContent = config.elementId
        ? getContentByKey({key: config.elementId})
        : getCurrentContent(); //log.info(toStr({elementContent}));
    const {data} = elementContent; log.info(toStr({data}));
    const tag = config.tag || data.tag || 'div';

    const dataAttributes = nameValueItemSetToObject(data.attributes ? forceArray(data.attributes) : []); //log.info(toStr({dataAttributes}));
    const configAttributes = nameValueItemSetToObject(config.attributes ? forceArray(config.attributes) : []); //log.info(toStr({configAttributes}));
    const attributes = merge(dataAttributes, configAttributes); //log.info(toStr({attributes}));

    //const dataStyle = styleOptionSetToObject(data.style); //log.info(toStr({dataStyle}));
    const dataStyle = styleObjectFromData(data); log.info(toStr({dataStyle}));
    const configStyle = styleOptionSetToObject(config.style); //log.info(toStr({configStyle}));
    const style = merge(dataStyle, configStyle); //log.info(toStr({style}));

    const dataBreakPoints = breakpointsItemSetToObject(data.breakpoints); //log.info(toStr({dataBreakPoints}));
    const configBreakPoints = breakpointsItemSetToObject(config.breakpoints); //log.info(toStr({configBreakPoints}));
    const breakpoints = merge(dataBreakPoints, configBreakPoints); //log.info(toStr({breakpoints}));

    attributes._s = style;
    attributes._m = breakpoints;
    //log.info(toStr({attributes}));

    const content = config.content || data.content || '';
    const dom = R[tag](attributes, content);
    const r = R.render(dom);
    return {
        body: r.html,
        contentType: 'text/html; charset=utf-8',
        pageContributions: {
            headEnd: [
                R.render(R.style(r.css.join(''))).html
            ]
        }
    };
}
