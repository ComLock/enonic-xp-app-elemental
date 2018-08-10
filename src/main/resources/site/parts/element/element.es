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


function getParents(ids, seenParentIds = []) {
    //log.info(toStr({getParents: {ids, seenParentIds}}));
    if (!ids) { return []; }
    let parents = [];
    forceArray(ids).forEach((key) => {
        if (seenParentIds.includes(key)) { throw new Error(`Content id:${key} already seen! Circular inheritance!`); }
        seenParentIds.push(key);
        const parent = getContentByKey({key});
        if (parent.data.elementId) {
            parents = parents.concat(getParents(parent.data.elementId, seenParentIds)); // NOTE recursive
        }
        parents.push(parent);
    });
    //log.info(toStr({getParents: {parents}}));
    return parents;
}


function getTag(config, parents) {
    //log.info(toStr({getTag: {config, parents}}));
    if (config.tag) { return config.tag; }
    for (let i = parents.length - 1; i >= 0; i -= 1) {
        const parent = parents[i];
        //log.info(toStr({getTag: {parentData: parent.data}}));
        if (parent.data && parent.data.tag) { return parent.data.tag; }
    }
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


function childrenFromOptionSet(optionset, seenChildIds) {
    //log.info(toStr({optionset}));
    const children = [];
    forceArray(optionset).forEach((occurrence) => {
        if (occurrence._selected === 'text') {
            children.push(occurrence[occurrence._selected].text);
        } else {
            //log.info(toStr({selectedOccurrence: occurrence[occurrence._selected]}));
            //log.info(toStr({seenChildIds}));
            const key = occurrence[occurrence._selected].elementId;
            if (seenChildIds.includes(key)) { throw new Error(`Content id:${key} already seen! Circular inheritance!`); }
            seenChildIds.push(key);
            const child = getContentByKey({key});
            if (child) {
                children.push(buildDom({}, child, seenChildIds)); // eslint-disable-line no-use-before-define
            }
        }
    });
    return children;
}


function buildChildren(config, parents, seenChildIds) {
    if (config.children) { return childrenFromOptionSet(config.children, seenChildIds); }
    for (let i = parents.length - 1; i >= 0; i -= 1) {
        const parent = parents[i];
        if (parent.data && parent.data.children) {
            return childrenFromOptionSet(parent.data.children, seenChildIds);
        }
    }
    return '';
}


function buildDom(config, content, seenChildIds = []) {
    const parents = getParents(content.type === `${app.name}:element` ? content._id : config.elementId); //log.info(toStr({parents}));
    const tag = getTag(config, parents); //log.info(toStr({tag}));
    const attributes = buildAttributesObject(parents, config); //log.info(toStr({attributes}));
    attributes._s = buildStyleObject(parents, config);
    attributes._m = buildBreakpointsObject(parents, config);
    const children = buildChildren(config, parents, seenChildIds); //log.info(toStr({children}));
    return R[tag](attributes, children);
}


export function get() {
    const {config} = getComponent(); //log.info(toStr({config}));
    const currentContent = getCurrentContent(); //log.info(toStr({currentContent}));
    const dom = buildDom(config, currentContent);
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
