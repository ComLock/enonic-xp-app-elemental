import R from 'render-js/src/class.es';
import {camelize} from 'render-js/src/util/camelize.es';
import merge from 'deepmerge';


//import {toStr} from '/lib/enonic/util';
import {forceArray} from '/lib/enonic/util/data';
import {get as getContentByKey} from '/lib/xp/content';
import {
    getComponent,
    getContent as getCurrentContent
} from '/lib/xp/portal';


function nameValueItemSetToObject(itemset) {
    const o = {};
    if (!itemset) { return {}; }
    forceArray(itemset).forEach((item) => {
        o[camelize(item.name)] = item.value;
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


function getParents(ids, seenIds = []) {
    if (!ids) { return []; }
    let contents = [];
    forceArray(ids).forEach((key) => {
        if (seenIds.includes(key)) { throw new Error(`Content id:${key} already seen! Circular inheritance!`); }
        seenIds.push(key);
        const content = getContentByKey({key});
        if (content.data.elementId) {
            contents = contents.concat(getParents(content.data.elementId, seenIds)); // NOTE recursive
        }
        contents.push(content);
    });
    return contents;
}


function buildChildren(config, parents) {
    if (config.content) { return config.content; }
    for (let i = parents.length - 1; i > 0; i -= 1) {
        const parent = parents[i];
        if (parent.data && parent.data.content) { return parent.data.content; }
    }
    return '';
}


function getTag(config, parents) {
    if (config.tag) { return config.tag; }
    parents.forEach((parent) => { // eslint-disable-line consistent-return
        if (parent.data && parent.data.tag) { return parent.data.tag; }
    });
    return 'div';
}


function buildAttributesObject(parents, config) {
    return merge.all([
        ...parents
            .map(parent => parent.data ? nameValueItemSetToObject(parent.data.attributes) : {}), // eslint-disable-line no-confusing-arrow
        nameValueItemSetToObject(config.attributes)
    ]);
}


function buildStyleObject(parents, config) {
    return merge.all([
        ...parents
            .map(parent => parent.data // eslint-disable-line no-confusing-arrow
                ? styleOptionSetToObject(parent.data.style)
                : {}), //log.info(toStr({parentStyles}));
        styleOptionSetToObject(config.style)
    ]);
}


function breakpointsItemSetToObject(itemset) {
    if (!itemset) { return {}; }
    const o = {};
    forceArray(itemset).forEach((breakpoint) => {
        o[`minWidth${breakpoint.minWidth}`] = styleOptionSetToObject(breakpoint.style);
    });
    return o;
}


function buildBreakpointsObject(parents, config) {
    return merge.all([
        ...parents
            .map(parent => parent.data ? breakpointsItemSetToObject(parent.data.breakpoints) : {}), // eslint-disable-line no-confusing-arrow
        breakpointsItemSetToObject(config.breakpoints)
    ]);
}


export function get() {
    const {config} = getComponent(); //log.info(toStr({config}));
    const currentContent = getCurrentContent(); //log.info(toStr({currentContent}));
    const parents = getParents(currentContent.type === `${app.name}:element` ? currentContent._id : config.elementId); //log.info(toStr({parents}));
    const tag = getTag(config, parents); //log.info(toStr({tag}));
    const attributes = buildAttributesObject(parents, config); //log.info(toStr({attributes}));
    attributes._s = buildStyleObject(parents, config);
    attributes._m = buildBreakpointsObject(parents, config);
    //log.info(toStr({attributes}));
    const content = buildChildren(config, parents); //log.info(toStr({content}));
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
