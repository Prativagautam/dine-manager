/* Library */
import { Box, useMantineTheme } from '@mantine/core';

/**
 * Shared page wrapper — applies DESIGN.md's default background and text
 * color ONCE, here, instead of every page repeating it. Pages can still
 * override per PageWrapper.md discussion:
 *   - Whole-page override: pass a different `bg` prop, e.g.
 *       <PageWrapper bg={theme.other.someOtherBg}>
 *   - Single-element override: don't touch this wrapper at all, just set
 *     color/bg on that one element inside the page (badges already do
 *     this — color="attention" vs color="brand").
 *   - Recurring override (used on 3+ pages): promote it to a new named
 *     token in theme.ts's `other` block instead of repeating the
 *     override — keeps everything centralized, same reasoning as
 *     DESIGN.md itself.
 *
 * Reads from theme.other (set in theme.ts, generated from DESIGN.md) via
 * useMantineTheme() — never hardcode hex values in a page component.
 */
const PageWrapper = ({ children, bg, c, ...boxProps }) => {
	const theme = useMantineTheme();

	return (
		<Box
			bg={bg || theme.other.background}
			c={c || theme.other.onSurface}
			mih="100vh"
			p="xl"
			{...boxProps}
		>
			{children}
		</Box>
	);
};

export default PageWrapper;