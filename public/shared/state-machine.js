// Small dependency-free machine used by browser and server lifecycles.
// Validate before mutating so an invalid transition leaves the record intact.
export function transition(record, field, next, graph, name = field) {
 const previous = record[field];
 if (!Object.hasOwn(graph, next) || !Object.hasOwn(graph, previous) ||
     (previous !== next && !graph[previous].includes(next))) {
  throw Error(`Invalid ${name} transition: ${previous} → ${next}.`);
 }
 record[field] = next;
 return next;
}

export const connectionGraph = Object.freeze({
 idle:['bootstrapping','closed'], bootstrapping:['connected','interrupted','closed','bootstrapping'],
 connected:['interrupted','bootstrapping','closed'], interrupted:['recovering','connected','bootstrapping','closed'],
 recovering:['interrupted','connected','bootstrapping','closed'], closed:['bootstrapping']
});
