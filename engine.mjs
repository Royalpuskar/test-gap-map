function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Expected an object');
}
function array(value, label) {
  if (!Array.isArray(value) || value.length > 500) throw Error(label + ' must be an array of at most 500 items');
  return Array.from(value);
}
function lines(value) {
  return [...new Set(array(value, 'lines').map(line => {
    if (!Number.isInteger(line) || line < 1 || line > 1e12) throw Error('Lines must be positive integers at most 1e12');
    return line;
  }))].sort((a,b) => a-b);
}
function ranges(numbers) {
  const result = [];
  for (const line of numbers) {
    const last = result.at(-1);
    if (last && last.end + 1 === line) last.end = line;
    else result.push({start:line,end:line});
  }
  return result;
}
export function run(input) {
  object(input);
  if (JSON.stringify(input).length > 200000) throw Error('Input exceeds 200000 serialized characters');
  const paths = new Set(), evidence = [];
  const rows = array(input.files, 'files').map(file => {
    object(file);
    if (typeof file.path !== 'string' || !file.path.trim() || file.path.length > 100000) throw Error('Expected a nonempty file path');
    if (paths.has(file.path)) throw Error('Duplicate file paths are unsupported; combine each file into one entry');
    paths.add(file.path);
    const changed = lines(file.changed), covered = new Set(lines(file.covered));
    const explicit = Object.hasOwn(file, 'instrumented');
    const instrumented = explicit ? new Set(lines(file.instrumented)) : null;
    if (explicit && [...covered].some(line => !instrumented.has(line)))
      throw Error('Covered lines must be included in instrumented lines');
    const hit = [], missed = [], unknown = [];
    for (const line of changed) {
      if (covered.has(line)) hit.push(line);
      else if (!explicit || instrumented.has(line)) missed.push(line);
      else unknown.push(line);
    }
    const measured = hit.length + missed.length;
    evidence.push({path:file.path, mode:explicit?'instrumented':'assumed-complete',
      coveredLines:hit, uncoveredLines:missed, unknownLines:unknown,
      uncoveredRanges:ranges(missed), unknownRanges:ranges(unknown)});
    return {path:file.path, changed:changed.length, covered:hit.length, uncovered:missed.length,
      unknown:unknown.length, measuredCoveragePercent:measured ? 100 * hit.length / measured : null,
      lines:missed.join(', ') || 'none', unknownLines:unknown.join(', ') || 'none'};
  });
  const sum = key => rows.reduce((total,row) => total + row[key], 0);
  const covered = sum('covered'), uncovered = sum('uncovered'), unknown = sum('unknown');
  return {metrics:{files:rows.length,changed:sum('changed'),covered,uncovered,unknown}, rows, evidence,
    summary:{complete:unknown===0,measuredCoveragePercent:covered+uncovered ? 100*covered/(covered+uncovered) : null}};
}
